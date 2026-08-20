import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent, routes } from './app.component';
import { provideHttpClient } from '@angular/common/http';
describe('AppComponent',()=>{it('creates the application shell',()=>{TestBed.configureTestingModule({imports:[AppComponent],providers:[provideHttpClient(),provideRouter(routes)]});expect(TestBed.createComponent(AppComponent).componentInstance).toBeTruthy();});});
