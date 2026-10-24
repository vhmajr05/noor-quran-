package com.noorquran.app;

import android.Manifest;
import android.content.ComponentName;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.core.content.ContextCompat;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.json.JSONObject;

/** Pont entre l'interface web (JavaScript) et le lecteur natif NoorAudioService. */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(
    name = "NoorAudio",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") })
public class NoorAudioPlugin extends Plugin {
  private final Handler main = new Handler(Looper.getMainLooper());
  private MediaController controller;
  private ListenableFuture<MediaController> future;
  private Runnable sleepTask;
  private boolean pauseAtEnd = false;

  private final Player.Listener listener = new Player.Listener() {
    @Override public void onMediaItemTransition(@Nullable MediaItem item, int reason) {
      JSObject o = snapshot();
      o.put("id", item == null ? "" : item.mediaId);
      notifyListeners("item", o);
    }
    @Override public void onIsPlayingChanged(boolean isPlaying) { notifyListeners("state", snapshot()); }
    @Override public void onPlaybackStateChanged(int s) {
      notifyListeners(s == Player.STATE_ENDED ? "ended" : "state", snapshot());
    }
    @Override public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {
      if (!playWhenReady && reason == Player.PLAY_WHEN_READY_CHANGE_REASON_END_OF_MEDIA_ITEM) {
        notifyListeners("verseEnded", snapshot());
      }
      notifyListeners("state", snapshot());
    }
    @Override public void onPlayerError(PlaybackException e) {
      JSObject o = snapshot();
      o.put("message", String.valueOf(e.getMessage()));
      o.put("code", e.errorCode);
      notifyListeners("error", o);
    }
  };

  private JSObject snapshot() {
    JSObject o = new JSObject();
    MediaController c = controller;
    if (c == null) return o;
    long d = c.getDuration();
    o.put("playing", c.isPlaying());
    o.put("playWhenReady", c.getPlayWhenReady());
    o.put("index", c.getCurrentMediaItemIndex());
    o.put("count", c.getMediaItemCount());
    o.put("positionMs", c.getCurrentPosition());
    o.put("durationMs", d == C.TIME_UNSET ? 0 : d);
    o.put("state", c.getPlaybackState());
    return o;
  }

  private void applyPauseAtEnd() {
    ExoPlayer p = NoorAudioService.player;
    if (p != null) p.setPauseAtEndOfMediaItems(pauseAtEnd);
  }

  /** Exécute une action sur le lecteur (thread principal), en se connectant au service si besoin. */
  private void run(PluginCall call, Function<MediaController, JSObject> action) {
    main.post(() -> {
      try {
        if (controller != null && !controller.isConnected()) { controller.release(); controller = null; future = null; }
        if (controller != null) { finish(call, action, controller); return; }
        if (future == null) {
          SessionToken token = new SessionToken(getContext(), new ComponentName(getContext(), NoorAudioService.class));
          future = new MediaController.Builder(getContext(), token).buildAsync();
        }
        final ListenableFuture<MediaController> f = future;
        f.addListener(() -> {
          try {
            MediaController c = f.get();
            if (controller != c) { controller = c; c.addListener(listener); }
            finish(call, action, c);
          } catch (Exception e) { future = null; call.reject("Lecteur indisponible : " + e.getMessage()); }
        }, ContextCompat.getMainExecutor(getContext()));
      } catch (Exception e) { call.reject("Lecteur indisponible : " + e.getMessage()); }
    });
  }

  private void finish(PluginCall call, Function<MediaController, JSObject> action, MediaController c) {
    try { JSObject r = action.apply(c); call.resolve(r == null ? new JSObject() : r); }
    catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
  }

  @PluginMethod
  public void setQueue(PluginCall call) {
    try {
      JSArray arr = call.getArray("items");
      List<MediaItem> list = new ArrayList<>();
      for (int i = 0; i < arr.length(); i++) {
        JSONObject o = arr.getJSONObject(i);
        MediaMetadata md = new MediaMetadata.Builder()
            .setTitle(o.optString("title")).setArtist(o.optString("artist")).setAlbumTitle(o.optString("album")).build();
        list.add(new MediaItem.Builder().setMediaId(o.optString("id")).setUri(o.getString("url")).setMediaMetadata(md).build());
      }
      final int index = call.getInt("index", 0);
      final long pos = call.getInt("positionMs", 0);
      final float speed = call.getFloat("speed", 1f);
      final boolean autoplay = call.getBoolean("autoplay", true);
      pauseAtEnd = call.getBoolean("pauseAtEnd", false);
      run(call, c -> {
        c.setMediaItems(list, index, pos);
        c.setPlaybackParameters(new PlaybackParameters(speed));
        applyPauseAtEnd();
        c.prepare();
        if (autoplay) c.play();
        return null;
      });
    } catch (Exception e) { call.reject("File de lecture invalide : " + e.getMessage()); }
  }

  @PluginMethod public void play(PluginCall call) { run(call, c -> { c.play(); return null; }); }
  @PluginMethod public void pause(PluginCall call) { run(call, c -> { c.pause(); return null; }); }
  @PluginMethod public void next(PluginCall call) { run(call, c -> { c.seekToNextMediaItem(); c.play(); return null; }); }
  @PluginMethod public void previous(PluginCall call) { run(call, c -> { c.seekToPreviousMediaItem(); c.play(); return null; }); }
  @PluginMethod public void seek(PluginCall call) {
    final int index = call.getInt("index", 0);
    final long pos = call.getInt("positionMs", 0);
    run(call, c -> { c.seekTo(index, pos); return null; });
  }
  @PluginMethod public void setSpeed(PluginCall call) {
    final float speed = call.getFloat("speed", 1f);
    run(call, c -> { c.setPlaybackParameters(new PlaybackParameters(speed)); return null; });
  }
  @PluginMethod public void getState(PluginCall call) { run(call, c -> snapshot()); }
  @PluginMethod public void stop(PluginCall call) {
    run(call, c -> { c.stop(); c.clearMediaItems(); return null; });
  }

  @PluginMethod
  public void setPauseAtEnd(PluginCall call) {
    pauseAtEnd = call.getBoolean("enabled", false);
    main.post(() -> { applyPauseAtEnd(); call.resolve(); });
  }

  /** Minuteur de sommeil exécuté côté Android (fonctionne même si la WebView est endormie). */
  @PluginMethod
  public void setSleep(PluginCall call) {
    final int minutes = call.getInt("minutes", 0);
    main.post(() -> {
      if (sleepTask != null) main.removeCallbacks(sleepTask);
      sleepTask = null;
      if (minutes > 0) {
        sleepTask = () -> {
          if (controller != null && controller.isConnected()) controller.pause();
          notifyListeners("sleep", new JSObject());
        };
        main.postDelayed(sleepTask, minutes * 60000L);
      }
      call.resolve();
    });
  }

  @PluginMethod
  public void requestNotifications(PluginCall call) {
    if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
      requestPermissionForAlias("notifications", call, "notifResult");
    } else {
      call.resolve();
    }
  }

  @PermissionCallback
  private void notifResult(PluginCall call) { call.resolve(); }

  @Override
  protected void handleOnDestroy() {
    main.post(() -> { if (controller != null) { controller.release(); controller = null; future = null; } });
  }
}
