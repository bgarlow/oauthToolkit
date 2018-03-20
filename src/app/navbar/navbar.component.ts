import { Component, OnInit } from '@angular/core';
import { ToolkitService } from '../services/toolkit.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  menuClaims;

  constructor(private toolkit: ToolkitService) { }

  ngOnInit() {
    this.menuClaims = this.toolkit.menuClaims;
  }

}
