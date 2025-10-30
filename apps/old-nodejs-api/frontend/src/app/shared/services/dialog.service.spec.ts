import { TestBed } from "@angular/core/testing";
import { DialogService } from "./dialog.service";
import { MatDialog } from "@angular/material/dialog";
import { of } from "rxjs";

describe("DialogService", () => {
  let service: DialogService;
  let dialog: jasmine.SpyObj<MatDialog>;

  const mockPaths = ["/path/to/file1", "/path/to/file2"];

  beforeEach(() => {
    const dialogSpy = jasmine.createSpyObj("MatDialog", ["open"]);
    dialogSpy.open.and.returnValue({
      afterClosed: () => of({ success: true }),
    });

    TestBed.configureTestingModule({
      providers: [DialogService, { provide: MatDialog, useValue: dialogSpy }],
    });

    service = TestBed.inject(DialogService);
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should open multisearch dialog", () => {
    service.openMultisearchDialog(mockPaths);
    expect(dialog.open).toHaveBeenCalled();
  });

  it("should return dialog result", () => {
    const result = service.openMultisearchDialog(mockPaths);
    expect(result).toBeTruthy();
  });

  // TODO: Diğer diyalog metodları için testler eklenecek
  describe("confirm", () => {
    it("should be implemented", () => {
      const config = {
        title: "Test",
        message: "Test message",
      };
      const result = service.confirm(config);
      expect(result).toBeTruthy();
    });
  });

  describe("info", () => {
    it("should be implemented", () => {
      const config = {
        title: "Test",
        message: "Test message",
      };
      const result = service.info(config);
      expect(result).toBeTruthy();
    });
  });

  describe("form", () => {
    it("should be implemented", () => {
      class TestComponent {}

      const config = {
        title: "Test",
        component: TestComponent,
      };
      const result = service.form(config);
      expect(result).toBeTruthy();
    });
  });
});
