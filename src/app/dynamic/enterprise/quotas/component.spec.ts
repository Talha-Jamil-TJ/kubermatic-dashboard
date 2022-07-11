//                Kubermatic Enterprise Read-Only License
//                       Version 1.0 ("KERO-1.0”)
//                   Copyright © 2022 Kubermatic GmbH
//
// 1. You may only view, read and display for studying purposes the source
//    code of the software licensed under this license, and, to the extent
//    explicitly provided under this license, the binary code.
// 2. Any use of the software which exceeds the foregoing right, including,
//    without limitation, its execution, compilation, copying, modification
//    and distribution, is expressly prohibited.
// 3. THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
//    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// END OF TERMS AND CONDITIONS

import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BrowserModule, By} from '@angular/platform-browser';
import {MatTableModule} from '@angular/material/table';

import {lastValueFrom} from 'rxjs';

import {SharedModule} from '@shared/module';

import {QuotaService} from '@core/services/quota';
import {UserService} from '@core/services/user';

import {QuotaServiceMock} from '@test/services/quota-mock';
import {UserMockService} from '@test/services/user-mock';

import {QuotasComponent} from './component';

describe('QuotasComponent', () => {
  let fixture: ComponentFixture<QuotasComponent>;
  let component: QuotasComponent;

  let quotaService: QuotaService;
  let userService: UserService;

  const getQuotas = () => lastValueFrom(quotaService['_getQuotas']());
  const getUser = () => lastValueFrom(userService.currentUser);
  const getUserSetting = () => lastValueFrom(userService.currentUserSettings);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserModule, NoopAnimationsModule, SharedModule, MatTableModule],
      declarations: [QuotasComponent],
      providers: [
        {provide: QuotaService, useClass: QuotaServiceMock},
        {provide: UserService, useClass: UserMockService},
      ],
    }).compileComponents();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(QuotasComponent);
    component = fixture.componentInstance;

    quotaService = TestBed.inject(QuotaService);
    userService = TestBed.inject(UserService);

    fixture.detectChanges();
  });

  it('should initialize', async () => {
    expect(component).toBeTruthy();
  });

  it('should display table when quotas are loaded', async () => {
    component.isLoading = false;
    component.quotas = await getQuotas();
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('table'));

    expect(element.nativeElement.hidden).toEqual(false);
  });

  it('should hide table when quotas are loading', async () => {
    component.isLoading = true;
    component.quotas = await getQuotas();
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('table'));

    expect(element.nativeElement.hidden).toEqual(true);
  });

  it('should not display table when quotas are loaded empty', async () => {
    component.isLoading = false;
    component.quotas = [];
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('table'));

    expect(element.nativeElement.hidden).toEqual(true);
  });

  it('should not display loading spinner when quotas are loading', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('#quotas-loading-spinner'));

    expect(element).toBeTruthy();
  });

  it('should hide loading spinner when quotas are loaded', () => {
    component.isLoading = false;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('#quotas-loading-spinner > mat-spinner'));

    expect(element).toBeFalsy();
  });

  it('should display correct message when loaded quotes are empty', () => {
    component.isLoading = false;
    component.quotas = [];
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('#quotes-not-found'));

    expect(element.nativeElement.textContent.trim()).toEqual('No Quotas Found');
  });

  it('should display paginator when received quotes are more than the user defined page size', () => {
    const mockLength = 5;
    component.quotas.length = mockLength - 1;
    component.paginator.pageSize = mockLength;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('#quotas-paginator'));

    expect(element.nativeElement.hidden).toEqual(true);
  });

  it('should hide paginator when received quotes are less than the user defined page size', () => {
    const mockLength = 5;
    component.quotas.length = mockLength;
    component.paginator.pageSize = mockLength + 1;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('#quotas-paginator'));

    expect(element.nativeElement.hidden).toEqual(true);
  });

  it('should call add() when [Add Project Quota] button is clicked', () => {
    const spy = jest.spyOn(component, 'add');

    const element = fixture.debugElement.query(By.css('#km-add-quota-btn'));

    element.nativeElement.click();

    expect(spy).toHaveBeenCalled();
  });

  it('should set quotas when ngOnInit is called', async () => {
    const quotas = await getQuotas();

    component.ngOnInit();

    expect(component.quotas).toEqual(quotas);
  });

  it('should set user when ngOnInit is called', async () => {
    component.user = null;
    const user = await getUser();

    component.ngOnInit();

    expect(component.user).toStrictEqual(user);
  });

  it('should set paginator.pageSize when ngOnInit is called', async () => {
    const userSettings = await getUserSetting();

    component.ngOnInit();

    expect(component.paginator.pageSize).toEqual(userSettings.itemsPerPage);
  });

  it('should call setDataSource() when ngOnChanges() is called', async () => {
    const spy = jest.spyOn(component, 'ngOnChanges');

    component.ngOnChanges();

    expect(spy).toHaveBeenCalled();
  });

  it('should set dataSource.data when setDataSource() called', async () => {
    const quotas = await getQuotas();
    component.dataSource.data = [];
    component.quotas = quotas;

    component.setDataSource();

    expect(component.dataSource.data).toEqual(quotas);
  });

  it('should set dataSource.filter when onSearch() called', async () => {
    const filter = 'demo filter text';
    component.dataSource.filter = '';

    component.onSearch(filter);

    expect(component.dataSource.filter).toEqual(filter);
  });
});
