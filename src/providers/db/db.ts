
import {
  Events
} from 'ionic-angular';
import {
  Injectable
} from '@angular/core';
import PouchDB from 'pouchdb';
import pouchdbadapteridb from 'pouchdb-adapter-idb';
import {
  Movie
} from '../../model/movie';
/*
  Generated class for the DbProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class DbProvider {

  private sdb: any;
  private db: any;
  private options: {
    live: boolean,
    retry: boolean,
    continuous: boolean
  };
  private sharedRemote: string;
  private remote: string;
  private user: string;
  private movies: Object;
  private loggedIn: boolean = false;
  private username = "";
  private password = "";
  private sharedOptions: any;
  private basicOptions;
  private acceptedFriends = [];
  private moviesInView: Object = {};
  private counter: Object = {};

  constructor(public events: Events) {
    
    this.counter["seen"] = 20;
    this.counter["watch"] = 20;
    this.username = 'bdacf8d9-eac9-4a6f-bc3b-2ad16614d31d-bluemix';
    this.password = '142963408785f5c6fe057bd73c7e0db10527bd0003ab1b889bdf7421a3025c39';
    this.sharedRemote = 'https://bdacf8d9-eac9-4a6f-bc3b-2ad16614d31d-bluemix.cloudant.com/shared-new';
    this.sharedOptions = {
      live: true,
      retry: true,
      continuous: true,
      auth: {
        username: this.username,
        password: this.password
      }
    }
    this.basicOptions = {
      auth: {
        username: this.username,
        password: this.password
      }
    }

    this.options = {
      live: true,
      retry: true,
      continuous: true
    }

    PouchDB.plugin(pouchdbadapteridb);
 
   
  }

  getMovies(type: string): Movie [] {
    return this.movies[type];
  }

  setMoviesInView(type: string, movies?: Movie[])
  {
    if(movies)
    {
      
      this.moviesInView[type] = movies.slice(0, this.counter[type]);
    }
    else {
      this.moviesInView[type] = this.getMovies(type).slice(0, this.counter[type]);
    }
  }

  getMoviesInView(type: string): Movie []{
    return this.moviesInView[type];
  }

  setCounter(type: string, amount: number): void {
    this.counter[type] = amount;
  }

  getCounter(type: string): number {
    return this.counter[type];
  }




  init(details, signingUp: boolean): void {

    if (this.movies === undefined) {
      this.movies = {
        "watch": [],
        "seen": [],
        "recommendations": []
      }
    } 

    this.db = new PouchDB('movies', {adapter: 'idb'})
 //   this.db.adapter('worker', worker);
    this.remote = details.userDBs.supertest;
    this.user = details.user_id;
    this.sdb = new PouchDB('shared',{adapter: 'idb'});
   // this.sdb.adapter('worker', worker);
    this.db.sync(this.remote).on('complete', async x => { // with the live options, complete never fires, so when its in sync, fire an event in the register page
      this.db.sync(this.remote, this.options);
      await this.initializeMovies(); 
      this.events.publish("localsync:completed");
    })
    this.sdb.sync(this.sharedRemote, this.basicOptions).on('complete', async info => {
      this.sdb.sync(this.sharedRemote, this.sharedOptions);
      this.movies["recommendations"] = await this.getRecommendations() || []; // prevent undefined when a user is registered
      this.acceptedFriends = await this.getAcceptedFriends() || [];
      this.listenToChanges();
      this.events.publish("sharedsync:completed");

    });
    this.loggedIn = true;
    if (signingUp) {
      this.db.put({
        _id: this.user,
        movies: []
      })
    }
    
  }

  async updateAcceptedFriends(){
    this.acceptedFriends = await this.getAcceptedFriends();
  } 

  getAcceptedFriendsProperty() {
    return this.acceptedFriends;
  }


  listenToChanges() {
    this.sdb.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', async change => {
  
      if(change.id === this.user)
      {
        // todo: implement friend invite accepted toast
        // --> A invites B, B accepts and A gets a toast, beware: if A accepts, shouldnt get a toast, he just accepted
        var filteredFriends = change.doc.friends.filter(friend => friend.accepted);  
        if(this.movies["recommendations"].length < change.doc.recommendations.length)
        {
          let movie = change.doc.recommendations[change.doc.recommendations.length -1];
          this.events.publish("movie:recievedRecommendation", movie);
          this.movies["recommendations"].push(movie); // push it locally, save a call
        }
        if (this.acceptedFriends.length < filteredFriends.length )
        {
          let newFriend = filteredFriends[ filteredFriends.length -1];
          let showPopup: boolean = false;
          if(change.doc.sentInvites.findIndex(u => u.username === newFriend.username)  !== -1)
          {
            showPopup = true;
          }
          await this.updateAcceptedFriends();
          this.events.publish("friend:accepted", newFriend, showPopup);
        }
      }
      // change.id contains the doc id, change.doc contains the doc
     if (change.deleted) {
        // document was deleted
      } else {
        // document was added/modified
      }
    }).on('error',  err => {
      console.log(err);
    });
  }

  findNewFriend(arr1, arr2)
  {
    return arr1.filter(x => !arr2.includes(x));
  }

  async initializeMovies() {
    await this.getMoviesByType("watch");
    await this.getMoviesByType("seen");
    this.moviesInView["seen"] = this.getMoviesInView("seen");
  }
  async register(user) {
    this.sdb.put({
      _id: this.user,
      email: user.email,
      isPublic: true,
      avatar: "https://ionicframework.com/dist/preview-app/www/assets/img/marty-avatar.png", // set a default avatar
      friends: [],
      sentInvites: [],
      recievedInvites: [],
      recommendations: [],
    })
    let doc = await this.sdb.get("allUsers");
    doc.users.push({
      "username": this.user,
      "isPublic": true,
      "avatar": "https://ionicframework.com/dist/preview-app/www/assets/img/marty-avatar.png",
      "email": user.email
    });
    this.sdb.put(doc);
    this.loggedIn = true;
  }

  logOut() {
    this.movies = undefined;
    this.db.destroy();
    this.sdb.destroy();
  }

  isloggedIn() {
    return this.loggedIn;
  }
  getUser() {
    return this.user;
  }
  async getAllUsers() {
    try {
      let declinedFriends = await this.getDeclinedFriends();
      let invitedFriends = await this.getSentInvitesFriends();
      let doc = await this.sdb.get("allUsers");
      return doc.users.filter(user => {
        return (
          (declinedFriends.findIndex(u => u.username === user.username) === -1)
          && user.username !== this.user 
          && user.isPublic 
          && invitedFriends.findIndex(u => u.username === user.username) === -1);
        // filter out declined friends in the searchbar and the logged in user
        // filter out friends you already invited
      })
      // todo add profile page to update this.public (default is now true)
    } catch (err) {
      console.log(err);
    }
  }

  async getAllFriends() {
    try {
      let doc = await this.sdb.get(this.user);
    return doc.friends
    }
    catch (err) {
      console.log(err);
    }
  }


  async inviteFriend(username: string) {
    // todo fix multiple users invited giving a 409
    try {
      let doc = await this.sdb.get(this.user);
      doc.sentInvites.push({
        "username": username,
        "accepted": false,
        "declined": false
      })
      await this.sdb.put(doc, {latest:true, force: true}); 
      // forces the latest revision: todo: test with recommendations etc
      let otherdoc = await this.sdb.get(username);
      otherdoc.recievedInvites.push({
        "username": this.user,
        "accepted": false,
        "declined": false
      })
      await this.sdb.put(otherdoc, {latest:true, force: true});
    } catch (err) {
      console.log(err);
    }
  }

  findFriend(friends, username) {
    for (let index = 0; index < friends.length; index++) {
      const friendObject = friends[index];
      if (friendObject.username === username) {
        return index;
      }
    }
  }
  findMovie(movies, movieId)
  {
    for (let index = 0; index < movies.length; index++) {
      const movieObject = movies[index];
      if (movieObject.id === movieId) {
        return index;
      }
    }
  }

  async getOpenFriendInvites() {
    try {
      let doc = await this.sdb.get(this.user)
      return doc.recievedInvites.filter((friend) => {
        return (!friend.accepted && !friend.declined)
      })
    } catch (err) {
      console.log(err)
    }
  }

  async declineFriendInvite(username) {
    try {
      let doc = await this.sdb.get(this.user);
      let index = this.findFriend(doc.recievedInvites, username);
      if (index > -1) {
        doc.recievedInvites.splice(index, 1); // remove from recievedInvites when declining
      }
      doc.friends.push({
        "username": username,
        "accepted": false,
        "declined": true
      })
      this.sdb.put(doc);
      let otherdoc = await this.sdb.get(username);
      otherdoc.friends.push({
        "username": this.user,
        "accepted": false,
        "declined": true
      });
      this.sdb.put(otherdoc);
      // you cant reinvite other friends that declined you, not very subtle
    } catch (err) {
      console.log(err);
    }
  }

  

  async acceptFriendInvite(username) {
    try {
      // invitee gets the invite and accepts it by pushing it into his friends array
      let doc = await this.sdb.get(this.user);
      let index = this.findFriend(doc.recievedInvites, username);
      if (index > -1) {
        doc.recievedInvites.splice(index, 1); // remove from recievedInvites when accepting
      }
      if (doc.friends.findIndex(u => u.username === username) === -1) {
        doc.friends.push({
          "username": username,
          "accepted": true,
          "declined": false
        })
        // push the friend to the friends array only if its not in it already
        // todo: find a nicer way to handle multiple friend invites sent (A sent to B, B sent to A, now friend gets added once but still a pop up)
      }
      await this.sdb.put(doc);
      // update recievedinvites 
      // add the invitee to the inviters friends array
      let otherdoc = await this.sdb.get(username);
      otherdoc.friends.push({
        "username": this.user,
        "accepted": true,
        "declined": false
      })
      await this.sdb.put(otherdoc);
    } catch (err) {
      console.log(err);
    }
  }

  async getAcceptedFriends() {
    try {
      let doc = await this.sdb.get(this.user)
      return doc.friends.filter(friend => {
        return (!friend.declined && friend.accepted)
      })
    } catch (err) {
      console.log(err)
    }
  }
  async getDeclinedFriends() {
    try {
      let doc = await this.sdb.get(this.user)
      return doc.friends.filter(friend => {
        return friend.declined;
      })
    } catch (err) {
      console.log(err)
    }
  }

  async getSentInvitesFriends() {
    try {
      let doc = await this.sdb.get(this.user)
      return doc.sentInvites;
    } catch (err) {
      console.log(err)
    }
  }

  async addRecommendation(recommendMovie, friend, recommendationText) {
    try {
      let doc = await this.sdb.get(friend.username);
      let cloneOfRecommendMovie = JSON.parse(JSON.stringify(recommendMovie));
      cloneOfRecommendMovie["recommendationText"] = recommendationText;
      cloneOfRecommendMovie["recommendedBy"] = {
        "username": this.user,
        "avatar": "https://ionicframework.com/dist/preview-app/www/assets/img/marty-avatar.png"
      } // im recommending stuff so yes
      doc.recommendations.push(cloneOfRecommendMovie); // TODO: rework into "user" model and pass a user object
      await this.sdb.put(doc);
    } catch (err) {
      console.log(err);
    }
  }
  async getRecommendations() {
    try {
      let doc = await this.sdb.get(this.user)
      return doc.recommendations;
    } catch (err) {
      console.log(err)
    }
  }
  // todo:add overview etc
  async addMovie(type: string, movie: Movie) {
    try {
      let doc = await this.db.get(this.user)
      movie.type = type;
      doc.movies.push(movie);
      this.movies[type].push(movie);
      await this.db.put(doc);
    } catch (err) {
      console.log(err)
    }
  }

  async removeMovie(type: string, movie: Movie)
  {
    try {

      let doc = await this.db.get(this.user)
      let i = this.findMovie(doc.movies, movie.id);
      if(i > -1)
      {
        doc.movies.splice(i, 1);
      }
      let j = this.findMovie(this.movies[type], movie.id);
      if(j > -1)
      {
        this.movies[type].splice(j, 1);
      }
      await this.db.put(doc);
      
    } catch (err) {
      console.log(err)
    }

  }

  async getMoviesByType(type: string) {
    let doc = await this.db.get(this.user);
    this.movies[type] = doc.movies.filter(movie => movie.type === type);
  }

}
