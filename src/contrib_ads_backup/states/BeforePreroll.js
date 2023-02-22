import States from '../states.js';

const ContentState = States.getState('ContentState');

import getAds from '../ads.js';
/*
 * This is the initial state for a player with an ad plugin. Normally, it remains in this
 * state until a "play" event is seen. After that, we enter the Preroll state to check for
 * prerolls. This happens regardless of whether or not any prerolls ultimately will play.
 * Errors and other conditions may lead us directly from here to ContentPlayback.
 */
class BeforePreroll extends ContentState {

  /*
   * Allows state name to be logged even after minification.
   */
  static _getName() {
    return 'BeforePreroll';
  }

  /*
   * For state transitions to work correctly, initialization should
   * happen here, not in a constructor.
   */
  init(player) {
    this.adsReady = false;
    this.shouldResumeToContent = false;

    // Content playback should be blocked by callPlay() middleware if the allowVjsAutoplay
    // option hasn't been provided and autoplay is not desired.
    player.ads._shouldBlockPlay = player.ads.settings.allowVjsAutoplay ? !player.autoplay() : true;
  }

  /*
   * The ad plugin may trigger adsready before the play request. If so,
   * we record that adsready already happened so the Preroll state will know.
   */
  onAdsReady(player) {
    player.getAds = new getAds(player)
    player.getAds.debug('Received adsready event (BeforePreroll)');
    this.adsReady = true;
  }

  /*
   * Ad mode officially begins on the play request, because at this point
   * content playback is blocked by the ad plugin.
   */
  onPlay(player) {
    const Preroll = States.getState('Preroll');

    player.getAds.debug('Received play event (BeforePreroll)');

    // Check for prerolls
    this.transitionTo(Preroll, this.adsReady, this.shouldResumeToContent);
  }

  /*
   * All ads for the entire video are canceled.
   */
  onAdsCanceled(player) {
    player.getAds.debug('adscanceled (BeforePreroll)');
    this.shouldResumeToContent = true;
  }

  /*
   * An ad error occured. Play content instead.
   */
  onAdsError() {
    this.player.getAds.debug('adserror (BeforePreroll)');
    this.shouldResumeToContent = true;
  }

  /*
   * If there is no preroll, don't wait for a play event to move forward.
   */
  onNoPreroll() {
    this.player.getAds.debug('Skipping prerolls due to nopreroll event (BeforePreroll)');
    this.shouldResumeToContent = true;
  }

  /*
   * Prerolls skipped by ad plugin. Play content instead.
   */
  skipLinearAdMode() {
    const player = this.player;

    player.trigger('adskip');
    player.getAds.debug('skipLinearAdMode (BeforePreroll)');
    this.shouldResumeToContent = true;
  }

  onContentChanged() {
    this.init(this.player);
  }

}

States.registerState('BeforePreroll', BeforePreroll);

export default BeforePreroll;
