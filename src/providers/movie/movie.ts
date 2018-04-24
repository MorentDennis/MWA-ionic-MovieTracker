import {
  Injectable
} from '@angular/core';

import PouchDB from 'pouchdb';
import pouchdbfind from 'pouchdb-find';
import moment from 'moment';
import {
  Http,
  Headers
} from '@angular/http';
import blobUtil from 'blob-util';

/*
  Generated class for the MovieProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class MovieProvider {

  



  movies = {};
  sdb: any; // shared db with userlists 
  db: any;
  remote: any;
  user: string;

  api_key = "4e60ba1292b6c1d4bbf05e0fe3542a92";
  headers = new Headers();
  file_size = "w200"
  image_url = "https://image.tmdb.org/t/p/"

  constructor(public http: Http, ) {
    this.headers.append('Content-Type', 'application/json');
    PouchDB.plugin(pouchdbfind);

  }

  // api functions
  getMoviesSeen() {
    return this.movies["seen"]
  }

  getMoviesWatched() {
    return this.movies["watch"]
  }



  getKeyWords(keyword) {
    return new Promise(resolve => {
      let testKeyWord = keyword;
      let keyWordIDS = null;
      let keyWordURL = `https://api.themoviedb.org/3/search/keyword?api_key=${this.api_key}&query=${testKeyWord}`

      this.http.get(
        keyWordURL, {
          headers: this.headers
        }).subscribe(res => {
        keyWordIDS = res.json().results.map(id => id.id);
        keyWordIDS = keyWordIDS.slice(0, 1).join('|');
        resolve(keyWordIDS);
      }, err => console.log(err));

    })
  }


  getRelatedMovies(keywords) {

    return new Promise(resolve => {
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${this.api_key}&with_keywords=${keywords}`;
      let relatedMovies = [];
      this.http.get(
        url, {
          headers: this.headers
        }).subscribe(res => {

        res.json().results.forEach(movie => {
          relatedMovies.push({
            "id": movie.id,
            "title": movie.title,
            "poster": this.image_url + this.file_size + movie.poster_path,
            "overview": movie.overview
          })
        });
      }, err => console.log(err));

      resolve(relatedMovies);

    })
  }




  getMoviesInTheater() {

    return new Promise(resolve => {

      let now = moment().format('YYYY-MM-DD');
      let aMonthAgo = moment().subtract(1, 'months').format('YYYY-MM-DD');
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${this.api_key}&primary_release_date.gte=${aMonthAgo}&primary_release_date.lte=${now}`;

      let moviesIntheaters = [];
      let response;

      this.http.get(
        url, {
          headers: this.headers
        }).subscribe(res => {

        res.json().results.forEach(movie => {
          moviesIntheaters.push({
            "id": movie.id,
            "title": movie.title,
            "poster": this.image_url + this.file_size + movie.poster_path,
            "overview": movie.overview
          })
        });
      }, err => console.log(err));

      resolve(moviesIntheaters);
    })
  }






  // DB functions
  init(details) {
    this.db = new PouchDB('cloudo');
    this.remote = details.userDBs.supertest;
    this.user = details.user_id;
    console.log(details)
    let options = {
      live: true,
      retry: true,
      continuous: true
    };
    this.db.sync(this.remote, options);


    this.sdb = new PouchDB('shared');
    let sharedRemote = "http://localhost:5984/shared";
    this.sdb.sync(sharedRemote, options)
    // to do sync etc
    setTimeout(() => {
       this.showAllListsBySubscribers();
    }, 1000);
   
  }

  showAllListsBySubscribers() {

    this.sdb.find(
      { selector: {subscribers: { $elemMatch: {$eq: "riannetest"}}}}
   ).then(data => console.log(data))
  }

  logout() {
    this.movies = null;
    this.db.destroy().then(() => {
      console.log("db removed")
    });

    this.sdb.destroy();
  }

  async addMovie(type: string, movie: any) {

    await this.db.put({
      _id: type + movie.title,
      title: movie.title
    })
    let blob = await blobUtil.imgSrcToBlob(movie.poster, 'image/jpeg','Anonymous', 1.0)
    let doc = await this.db.get(type + movie.title);
    await this.db.putAttachment(type + movie.title, movie.title + '.png', doc._rev, blob, 'image/png')
  }

// TODO MOVE TO DB PROVIDER
  async getMovies_async(type: string)
  {
    this.movies[type] = [];
    let result = await this.db.allDocs({
      include_docs: true,
      startkey: type,
      endkey: type + '\ufff0',
      attachments: true
    })
    
    result.rows.forEach(async movieRow => {
      let blob = await this.db.getAttachment(type + movieRow.doc.title, movieRow.doc.title + '.png' )
      let posterURL = await blobUtil.blobToDataURL(blob)
      let movie = {title: movieRow.doc.title, poster: posterURL}
      this.movies[type].push(movie)
    })
    return this.movies[type];
  }

}

