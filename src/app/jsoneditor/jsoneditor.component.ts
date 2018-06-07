import { Component, OnInit, ViewChild } from '@angular/core';
import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';

@Component({
  selector: 'app-jsoneditor',
  templateUrl: './jsoneditor.component.html',
  styleUrls: ['./jsoneditor.component.css']
})
export class JsoneditorComponent implements OnInit {

  public editorOptions: JsonEditorOptions;
  public data: any;

  //@ViewChild(JsonEditorComponent) editor: JsonEditorComponent;

  constructor() {
    this.editorOptions = new JsonEditorOptions();
  }

  ngOnInit() {
    this.data = {};
    this.editorOptions.onChange = this.change.bind(this);
  }

  change() {
    console.log('change:' + this.editor);
  }

  initEditorOptions() {
    // this.editorOptions.mode = 'code'; //set only one mode
    this.editorOptions.modes = ['code', 'text', 'tree', 'view']; // set all allowed modes
  }

  setLanguage(lang) {
    this.editorOptions.language = lang; // force a specific language, ie. pt-BR
    this.editor.setOptions(this.editorOptions);
  }

  customLanguage() {
    this.editorOptions.languages = {
      'pt-BR': {
        'auto': 'Automático testing'
      },
      'en': {
        'auto': 'Auto testing'
      }
    };
    this.editor.setOptions(this.editorOptions);
  }

  changeObject() {
    this.data.randomNumber = Math.random() * 100;
  }

  setData(data) {
    this.editor.setData(data);
  }

  /**
   * Example on how get the json changed from the jsoneditor
   */
  getData() {
    const changedJson = this.editor.get();
    return changedJson;
  }
}
