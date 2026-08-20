import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAppInitializer, inject } from '@angular/core';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
import { Api } from './app/api.service';
import { AppComponent, routes } from './app/app.component';
import { apiErrorInterceptor } from './app/api.service';
bootstrapApplication(AppComponent, {providers:[provideHttpClient(withInterceptors([apiErrorInterceptor])),provideRouter(routes, withComponentInputBinding()),provideAppInitializer(() => { const api=inject(Api); return firstValueFrom(api.me().pipe(tap(r=>api.user.set(r.data.user)),catchError(()=>{api.user.set(null);return of(null)})));})]}).catch(err => console.error(err));
