import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { HomeComponent } from './features/home/home.component';
import { VideoChatComponent } from './features/Components/video-chat/video-chat.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: 'video-chat',
        component: VideoChatComponent
      },
      // {
      //   path: 'text-chat',
      //   loadComponent: () => import('./features/Components/video-chat/video-chat.component')
      //     .then(m => m.TextChatComponent)
      // }
    ]
  },
  // Optional: Standalone video chat route without main layout
  {
    path: 'call',
    component: VideoChatComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];