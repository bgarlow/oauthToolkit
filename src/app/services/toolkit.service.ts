import { Injectable } from '@angular/core';

@Injectable()
export class ToolkitService {

  private _baseUrl: string;
  private _selectedAuthServer;
  private _selectedClient;
  private _selectedScopes;
  private _selectedResponseType;

  private _menuClaims;

  set menuClaims(value: any) {
    this._menuClaims = value;
  }

  get menuClaims() {
    return this._menuClaims
  }

  set baseUrl(value: string) {
    this._baseUrl = value;
  }

  get baseUrl() {
    return this._baseUrl;
  }

  set selectedAuthServer(value: string) {
    this._selectedAuthServer = value;
  }

  get selectedAuthServer() {
    return this._selectedAuthServer;
  }

  set selectedClient(value: string) {
    this._selectedClient = value;
  }

  get selectedClient() {
    return this._selectedClient;
  }

  set selectedScopes(value: any) {
    this._selectedScopes = value;
  }

  get selectedScopes() {
    return this._selectedScopes;
  }

  set selectedResponseType(value: string) {
    this._selectedResponseType = value;
  }

  get selectedResponseType() {
    return this._selectedResponseType;
  }

  constructor() { }

}
