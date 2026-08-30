import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent, ShellComponent, routes } from './app.component';
import { provideHttpClient } from '@angular/common/http';

describe('AppComponent',()=>{
  const setViewport=(width:number)=>Object.defineProperty(window,'innerWidth',{configurable:true,value:width});

  it('creates the application shell',()=>{
    TestBed.configureTestingModule({imports:[AppComponent],providers:[provideHttpClient(),provideRouter(routes)]});
    expect(TestBed.createComponent(AppComponent).componentInstance).toBeTruthy();
  });

  it('adds mobile navigation only at the mobile breakpoint',()=>{
    setViewport(721);
    TestBed.configureTestingModule({imports:[ShellComponent],providers:[provideHttpClient(),provideRouter(routes)]});
    const fixture=TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Mobile navigation"]')).toBeNull();

    setViewport(720);
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Mobile navigation"]')).not.toBeNull();
  });
});
