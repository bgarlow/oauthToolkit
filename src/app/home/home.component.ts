import { Component, OnInit } from '@angular/core';
import {HttpClient} from '@angular/common/http';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit {

  htmlReadMe;

  constructor(private _http: HttpClient) { }

  ngOnInit() {
    this._http.get('/demo/readme')
      .subscribe(
        response => {
          console.log(response);
          this.htmlReadMe = response['html'];
        }
      );
  }

}
