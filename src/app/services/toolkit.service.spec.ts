import { TestBed, inject } from '@angular/core/testing';

import { ToolkitService } from './toolkit.service';

describe('ToolkitService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToolkitService]
    });
  });

  it('should be created', inject([ToolkitService], (service: ToolkitService) => {
    expect(service).toBeTruthy();
  }));
});
