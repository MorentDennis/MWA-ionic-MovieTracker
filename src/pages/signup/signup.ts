import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Http, Headers } from '@angular/http';

import { HomePage } from '../home/home';
import { DbProvider } from '../../providers/db/db';
import { TabsPage } from '../tabs/tabs';



/**
 * Generated class for the SignupPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html',
})
export class SignupPage {

  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public http: Http,
    public dbProvider: DbProvider) {
  }

  register() {
    let headers = new Headers();
      headers.append('Content-Type', 'application/json');
 
      let user = {
        name: this.name,
        username: this.username,
        email: this.email,
        password: this.password,
        confirmPassword: this.confirmPassword
      };
 
      this.http.post('http://localhost:3000/auth/register', JSON.stringify(user), {headers: headers})
        .subscribe(res => {
         // this.todoService.init(res.json());

          this.navCtrl.setRoot(TabsPage);
          this.dbProvider.init(res.json())
          console.log(res.json())
          this.dbProvider.register(user);
          this.dbProvider.addFriend("testfriend")
          
        }, (err) => {
          console.log(err);
        });
 
  }

  

}
