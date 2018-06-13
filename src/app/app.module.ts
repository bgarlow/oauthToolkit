import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { LoginComponent } from './login/login.component';
import { ProfileComponent } from './profile/profile.component';
import { ToolkitService } from './services/toolkit.service';
import { ToolkitComponent } from './toolkit/toolkit.component';
import { ConfigService } from './config.service';
import { NgJsonEditorModule } from 'ang-jsoneditor';
import { JsoneditorComponent } from './jsoneditor/jsoneditor.component';
import { CountDown } from 'ng4-date-countdown-timer';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HomeComponent,
    AboutComponent,
    LoginComponent,
    ProfileComponent,
    ToolkitComponent,
    JsoneditorComponent,
    CountDown
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    NgJsonEditorModule
  ],
  providers: [ToolkitService, ConfigService, JsoneditorComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
