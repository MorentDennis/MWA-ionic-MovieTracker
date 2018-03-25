import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Platform } from 'ionic-angular/platform/platform';
import { SeenMoviesPage } from '../seen-movies/seen-movies';


/**
 * Generated class for the TabsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */


@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html',
})
export class TabsPage {

  tabsPlacement: string;
  tabsLayout: string;

  page1: any = SeenMoviesPage;
  page2: any = SeenMoviesPage;
  page3: any = SeenMoviesPage;


  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform) {
    

    if (!this.platform.is('mobile')) {
      this.tabsPlacement = 'top';
      this.tabsLayout = 'icon-left';
    }
  }

  ionViewDidLoad() {
    
  }

}
