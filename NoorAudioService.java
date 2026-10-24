package com.noorquran.app;

import android.content.Intent;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

/**
 * Service de lecture Android (service de premier plan « mediaPlayback »).
 * Le lecteur ExoPlayer enchaîne lui-même les versets : la lecture continue écran verrouillé
 * ou depuis une autre application, sans dépendre de la WebView (qu'Android met en veille).
 */
@OptIn(markerClass = UnstableApi.class)
public class NoorAudioService extends MediaSessionService {
  // Même processus que le plugin : sert uniquement à régler « pause à la fin de chaque verset ».
  static volatile ExoPlayer player;
  private MediaSession session;

  @Override
  public void onCreate() {
    super.onCreate();
    AudioAttributes attrs = new AudioAttributes.Builder()
        .setUsage(C.USAGE_MEDIA)
        .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
        .build();
    ExoPlayer p = new ExoPlayer.Builder(this)
        .setAudioAttributes(attrs, true)      // gère le focus audio : appels, autres applications
        .setHandleAudioBecomingNoisy(true)    // pause si le casque / Bluetooth est débranché
        .setWakeMode(C.WAKE_MODE_NETWORK)     // garde le CPU et le Wi-Fi pendant la lecture
        .build();
    player = p;
    session = new MediaSession.Builder(this, p).build();
  }

  @Nullable
  @Override
  public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
    return session;
  }

  // Application retirée des applications récentes : on met en pause et on arrête le service proprement.
  @Override
  public void onTaskRemoved(@Nullable Intent rootIntent) {
    pauseAllPlayersAndStopSelf();
  }

  @Override
  public void onDestroy() {
    if (session != null) { session.release(); session = null; }
    if (player != null) { player.release(); player = null; }
    super.onDestroy();
  }
}
