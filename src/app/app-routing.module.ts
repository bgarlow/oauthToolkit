import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent} from './home/home.component';
import { AboutComponent} from './about/about.component';
import { LoginComponent} from './login/login.component';
import { ProfileComponent} from './profile/profile.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    //canActivate: [DefaultGuard]
  },
  {
    path: 'home',
    component: HomeComponent,
    //canActivate: [DefaultGuard]
  },
  {
    path: 'about',
    component: AboutComponent,
    //canActivate: [DefaultGuard]
  },
  {
    path: 'login',
    component: LoginComponent,
    //canActivate: [DefaultGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent
  }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes)],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
