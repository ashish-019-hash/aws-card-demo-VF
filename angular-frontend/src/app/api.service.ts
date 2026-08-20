import { HttpClient, HttpErrorResponse, HttpHeaders, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export interface User { id:string; firstName:string; lastName:string; role:'A'|'U'; }
export interface Page<T> { items:T[]; page:{limit:number; nextCursor?:string}; }
export interface ApiResponse<T> { data:T; meta?:{idempotentReplay:boolean}; }
export interface ApiError { status:number; code:string; message:string; stale:boolean; }
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router=inject(Router); const api=inject(Api);
  return next(req.clone({withCredentials:true})).pipe(catchError((e:HttpErrorResponse) => {
    if (e.status===401 && !req.url.endsWith('/api/auth/sign-in')) { api.user.set(null); void router.navigateByUrl('/sign-in'); }
    return throwError(():ApiError=>({status:e.status,code:e.error?.error?.code??'NETWORK_ERROR',message:e.error?.error?.message??'Unable to reach the service.',stale:e.status===412}));
  }));
};
@Injectable({providedIn:'root'}) export class Api {
 private readonly http=inject(HttpClient); readonly user=signal<User|null>(null);
 me(){return this.http.get<ApiResponse<{user:User}>>('/api/auth/me');}
 signIn(body:{userId:string;password:string}){return this.http.post<ApiResponse<{user:User}>>('/api/auth/sign-in',body);}
 signOut(){return this.http.post('/api/auth/sign-out',{});}
 get<T>(url:string, params?:Record<string,string>){return this.http.get<ApiResponse<T>>(url,{params});}
 text(url:string){return this.http.get(url,{responseType:'text'});}
 getResponse<T>(url:string, params?:Record<string,string>){return this.http.get<ApiResponse<T>>(url,{params,observe:'response'});}
 patch<T>(url:string, body:object, etag:string){return this.http.patch<ApiResponse<T>>(url,body,{headers:new HttpHeaders({'If-Match':etag}),observe:'response'});}
 post<T>(url:string,body:object,headers?:Record<string,string>){return this.http.post<ApiResponse<T>>(url,body,{headers:new HttpHeaders(headers??{}),observe:'response'});}
 delete(url:string,etag:string){return this.http.delete(url,{headers:new HttpHeaders({'If-Match':etag})});}
}
export const idempotencyKey=()=>crypto.randomUUID();
