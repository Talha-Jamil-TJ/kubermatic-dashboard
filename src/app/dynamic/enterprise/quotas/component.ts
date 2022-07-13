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

import {Component, OnChanges, OnInit, ViewChild} from '@angular/core';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort, Sort} from '@angular/material/sort';
import {MatDialog} from '@angular/material/dialog';

import {take, takeUntil, tap, filter} from 'rxjs/operators';
import {Subject, lastValueFrom} from 'rxjs';

import {getNumberFromString} from '@shared/utils/common';
import {QuotaDetails} from '@shared/entity/quota';
import {Member} from '@shared/entity/member';

import * as _ from 'lodash';

import {QuotaService} from '@core/services/quota';
import {UserService} from '@core/services/user';

import {ProjectQuotaDialogComponent} from './project-quota-dialog/component';
import {ConfirmationDialogComponent, ConfirmationDialogConfig} from '@shared/components/confirmation-dialog/component';
import {NotificationService} from '@core/services/notification';

enum Column {
  projectId = 'projectId',
  CPU = 'CPU',
  memory = 'memory',
  storage = 'storage',
  actions = 'actions',
}

@Component({
  selector: 'km-quotas',
  templateUrl: './template.html',
  styleUrls: ['style.scss'],
})
export class QuotasComponent implements OnInit, OnChanges {
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;

  user: Member;
  quotas: QuotaDetails[] = [];
  dataSource = new MatTableDataSource<QuotaDetails>(this.quotas);
  displayedColumns: string[] = [Column.projectId, Column.CPU, Column.memory, Column.storage, Column.actions];
  isLoading = true;

  Column = Column;

  private _unsubscribe = new Subject<void>();

  constructor(
    private readonly _notificationService: NotificationService,
    private readonly _quotaService: QuotaService,
    private readonly _userService: UserService,
    private readonly _matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.dataSource.sort = this.sort;
    this.sort.active = Column.projectId;
    this.sort.direction = 'asc';

    this._quotaService.quotas
      .pipe(
        tap(() => (this.isLoading = false)),
        filter(quotas => !_.isEqual(quotas.sort(), this.quotas.sort())),
        takeUntil(this._unsubscribe)
      )
      .subscribe({
        next: quotas => {
          this.quotas = quotas;
          this.onSortChange();
        },
      });

    this.dataSource.paginator = this.paginator;

    this._userService.currentUserSettings.pipe(takeUntil(this._unsubscribe)).subscribe(settings => {
      this.paginator.pageSize = settings.itemsPerPage;
      this.dataSource.paginator = this.paginator; // Force refresh.
    });

    this._userService.currentUser.pipe(take(1)).subscribe(user => (this.user = user));
  }

  ngOnChanges(): void {
    this.setDataSource();
  }

  ngOnDestroy(): void {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }

  setDataSource(quotas = this.quotas): void {
    this.dataSource.data = quotas;
  }

  async add(): Promise<void> {
    await lastValueFrom(
      this._matDialog
        .open<ProjectQuotaDialogComponent, never, never>(ProjectQuotaDialogComponent, {
          panelClass: 'km-quota-dialog',
        })
        .afterClosed()
    );
  }

  async edit(quota: QuotaDetails): Promise<void> {
    await lastValueFrom(
      this._matDialog
        .open<ProjectQuotaDialogComponent, QuotaDetails, never>(ProjectQuotaDialogComponent, {
          panelClass: 'km-quota-dialog',
          data: quota,
        })
        .afterClosed()
    );
  }

  async delete({name}: QuotaDetails): Promise<void> {
    const isConfirmed = await lastValueFrom(
      this._matDialog
        .open<ConfirmationDialogComponent, ConfirmationDialogConfig, boolean>(ConfirmationDialogComponent, {
          data: {
            title: 'Delete Quota',
            message: `Delete quota for ${name}?`,
            confirmLabel: 'Delete',
          },
        })
        .afterClosed()
    );

    if (!isConfirmed) return;

    await lastValueFrom(this._quotaService.deleteQuota(name));

    this._notificationService.success(`Deleting the ${name} datacenter`);
    this._quotaService.refreshQuotas();
  }

  onSortChange(sort: Sort = this.sort): void {
    const {active, direction} = sort;

    if (!active || !direction) {
      this.setDataSource();
      return;
    }

    const getNumber = getNumberFromString;
    const isAsc = direction === 'asc';
    const compare = (a: number | string, b: number | string) => (a < b ? -1 : 1) * (isAsc ? 1 : -1);

    const sorted = this.quotas.sort((a, b) => {
      switch (active) {
        case Column.projectId:
          return compare(a.name, b.name);
        case Column.memory:
          return compare(getNumber(a.quota?.memory), getNumber(b.quota?.memory));
        case Column.CPU:
          return compare(getNumber(a.quota?.cpu), getNumber(b.quota?.cpu));
        case Column.storage:
          return compare(getNumber(a.quota?.storage), getNumber(b.quota?.storage));
        default:
          return 0;
      }
    });

    this.setDataSource(sorted);
  }

  onSearch(query: string): void {
    this.dataSource.filter = query;
  }
}
