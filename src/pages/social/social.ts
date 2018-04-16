import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController, AlertController } from 'ionic-angular';
import { SocialProvider } from '../../providers/social/social';
import { AddFriendPage } from '../add-friend/add-friend';

/**
 * Generated class for the SocialPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-social',
  templateUrl: 'social.html',
})
export class SocialPage {

  friends: any;
  private allUsers: any;



  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public socialProvider: SocialProvider,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController) {
  }

  ionViewDidLoad() {
    this.setup();
    this.checkForFriendInvites();
  }

  async setup(){
    console.log("setup executed")
    this.friends = await this.socialProvider.getAcceptedFriends();
    console.log(this.friends)
  }

  addFriendAction(){
    let modal = this.modalCtrl.create(AddFriendPage);
    modal.onDidDismiss(data => {
      this.setup();
    })
    modal.present();
  }

  async checkForFriendInvites(){
    console.log("open invites")
    let openFriends = await this.socialProvider.getOpenInvitedFriends();
    openFriends.forEach(friend => {
      this.createPrompt(friend);
    });
  }

  createPrompt(friend) {
    let prompt = this.alertCtrl.create({
      title: 'Friend invite',
      message: friend.username + " invited you as a friend, will you accept or decline?",
      buttons: [
        {
          text: 'decline',
          handler: data => {
            console.log("who is this guy???")
            this.socialProvider.declineInvite(friend.username);
          }
        },
        {
          text: 'Accept',
          handler: async data => {
            await this.socialProvider.acceptInvite(friend.username)
            this.setup();
          }
        }
      ]
    });
    prompt.present();
  }
  }



