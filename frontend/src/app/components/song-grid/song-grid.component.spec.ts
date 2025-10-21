import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { SongGridComponent } from "./song-grid.component";
import { MusicPlayerService } from "../../services/music-player.service";
import { SearchResultComponent } from "./search-result/search-result.component";
import { Song } from "../../models/song.model";
import { of } from "rxjs";
import { environment } from "../../../environments/environment";

describe("SongGridComponent", () => {
  let component: SongGridComponent;
  let fixture: ComponentFixture<SongGridComponent>;
  let httpMock: HttpTestingController;
  let musicPlayerServiceSpy: jasmine.SpyObj<MusicPlayerService>;

  const mockSong: Song = {
    id: "test-song-1",
    filePath: "/test/path/song.mp3",
    isFileExists: false,
    status: "missing" as const,
  };

  const mockApiResponse = {
    status: "success",
    message: "Test mesajı",
    data: {
      searchTime: 100,
      results: [
        {
          originalPath: "/test/path/song.mp3",
          status: "similar_found",
          similarFiles: [
            {
              path: "/test/path/found-song.mp3",
              similarity: 90,
              analysisType: "name",
              analysisText: "İsim Benzerliği",
              line: 1,
              lineText: "Test line",
            },
          ],
        },
      ],
    },
  };

  beforeEach(async () => {
    musicPlayerServiceSpy = jasmine.createSpyObj("MusicPlayerService", [
      "play",
      "pause",
      "isPlaying",
    ]);
    musicPlayerServiceSpy.play.and.returnValue(of(void 0));
    musicPlayerServiceSpy.isPlaying.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [SongGridComponent, SearchResultComponent, HttpClientTestingModule],
      providers: [{ provide: MusicPlayerService, useValue: musicPlayerServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(SongGridComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("bileşen oluşturulmalı", () => {
    expect(component).toBeTruthy();
  });

  describe("searchSimilarFiles", () => {
    it("arama başladığında şarkı durumu güncellenmeli", fakeAsync(() => {
      component.songs = [mockSong];
      fixture.detectChanges();

      component.searchSimilarFiles(mockSong);

      const initialSong = component.songs[0];
      expect(initialSong.isSearching).toBe(true);
      expect(initialSong.similarFiles).toBeUndefined();

      const req = httpMock.expectOne(`${environment.apiUrl}/search/files`);
      expect(req.request.method).toBe("POST");
      req.flush({
        status: "success",
        message: "Test mesajı",
        data: {
          results: [
            {
              originalPath: "/test/path/song.mp3",
              status: "not_found",
              similarFiles: [],
            },
          ],
          searchTime: 100,
        },
      });

      tick();
      fixture.detectChanges();

      const finalSong = component.songs[0];
      expect(finalSong.isSearching).toBe(false);
      expect(finalSong.searchError).toBe("Benzer dosya bulunamadı");
      expect(finalSong.similarFiles).toBeUndefined();
      expect(finalSong.searchTime).toBe(100);
    }));

    it("benzer dosya bulunduğunda şarkı durumu güncellenmeli", fakeAsync(() => {
      component.songs = [mockSong];
      fixture.detectChanges();

      component.searchSimilarFiles(mockSong);

      const req = httpMock.expectOne(`${environment.apiUrl}/search/files`);
      expect(req.request.method).toBe("POST");
      req.flush(mockApiResponse);

      tick();
      fixture.detectChanges();

      const updatedSong = component.songs[0];
      expect(updatedSong.isSearching).toBe(false);
      expect(updatedSong.similarFiles).toBeDefined();
      expect(updatedSong.similarFiles?.length).toBe(1);
      expect(updatedSong.searchTime).toBe(100);
    }));

    it("benzer dosya bulunamadığında hata mesajı gösterilmeli", fakeAsync(() => {
      component.songs = [mockSong];
      fixture.detectChanges();

      component.searchSimilarFiles(mockSong);

      const req = httpMock.expectOne(`${environment.apiUrl}/search/files`);
      expect(req.request.method).toBe("POST");
      req.flush({
        status: "success",
        message: "Test mesajı",
        data: {
          results: [
            {
              originalPath: mockSong.filePath,
              status: "not_found",
              similarFiles: [],
            },
          ],
          searchTime: 100,
        },
      });

      tick();
      fixture.detectChanges();

      const updatedSong = component.songs[0];
      expect(updatedSong.searchError).toBe("Benzer dosya bulunamadı");
      expect(updatedSong.similarFiles).toBeUndefined();
    }));

    it("API hatası durumunda hata mesajı gösterilmeli", fakeAsync(() => {
      component.songs = [mockSong];
      fixture.detectChanges();

      component.searchSimilarFiles(mockSong);

      const req = httpMock.expectOne(`${environment.apiUrl}/search/files`);
      expect(req.request.method).toBe("POST");
      req.flush({
        status: "error",
        message: "Test hatası",
        data: {
          searchTime: 0,
          results: undefined,
        },
      });

      tick();
      fixture.detectChanges();

      const updatedSong = component.songs[0];
      expect(updatedSong.searchError).toBe("Beklenmeyen bir hata oluştu");
      expect(updatedSong.similarFiles).toBeUndefined();
    }));

    it("benzer dosyalar bulunduğunda UI güncellenmeli", fakeAsync(() => {
      component.songs = [mockSong];
      fixture.detectChanges();

      component.searchSimilarFiles(mockSong);

      const req = httpMock.expectOne(`${environment.apiUrl}/search/files`);
      expect(req.request.method).toBe("POST");
      req.flush(mockApiResponse);

      tick();
      fixture.detectChanges();

      const updatedSong = component.songs[0];
      expect(updatedSong.isSearching).toBe(false);
      expect(updatedSong.similarFiles).toBeDefined();
      expect(updatedSong.similarFiles?.length).toBe(1);
      expect(updatedSong.searchTime).toBe(100);
    }));

    it("filtreleme durumunda da benzer dosya sonuçları görüntülenmeli", fakeAsync(() => {
      const filteredSong: Song = {
        ...mockSong,
        status: "missing",
        isFileExists: false,
      };
      component.songs = [filteredSong];
      fixture.detectChanges();

      component.searchSimilarFiles(filteredSong);

      const req = httpMock.expectOne(`${environment.apiUrl}/search/files`);
      expect(req.request.method).toBe("POST");
      req.flush(mockApiResponse);

      tick();
      fixture.detectChanges();

      const updatedSong = component.songs[0];
      expect(updatedSong.isSearching).toBe(false);
      expect(updatedSong.similarFiles).toBeDefined();
      expect(updatedSong.similarFiles?.length).toBe(1);
      expect(updatedSong.searchTime).toBe(100);
    }));

    it("filtreleme durumunda benzer dosya bulunamadığında hata mesajı gösterilmeli", fakeAsync(() => {
      const filteredSong: Song = {
        ...mockSong,
        status: "missing",
        isFileExists: false,
      };
      component.songs = [filteredSong];
      fixture.detectChanges();

      component.searchSimilarFiles(filteredSong);

      const req = httpMock.expectOne(`${environment.apiUrl}/search/files`);
      expect(req.request.method).toBe("POST");
      req.flush({
        status: "success",
        message: "Test mesajı",
        data: {
          results: [
            {
              originalPath: filteredSong.filePath,
              status: "not_found",
              similarFiles: [],
            },
          ],
          searchTime: 100,
        },
      });

      tick();
      fixture.detectChanges();

      const updatedSong = component.songs[0];
      expect(updatedSong.searchError).toBe("Benzer dosya bulunamadı");
      expect(updatedSong.similarFiles).toBeUndefined();
    }));
  });
});
