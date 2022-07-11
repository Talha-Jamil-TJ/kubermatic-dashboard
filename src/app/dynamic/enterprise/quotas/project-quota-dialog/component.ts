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

import {Component, OnInit, OnDestroy, ChangeDetectorRef, AfterContentChecked} from '@angular/core';
import {FormGroup, FormBuilder, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';

import {takeUntil, finalize, filter} from 'rxjs/operators';
import {Observable, Subject, of} from 'rxjs';

import {NotificationService} from '@core/services/notification';
import {ProjectService} from '@core/services/project';
import {QuotaService} from '@core/services/quota';

import {QuotaVariables, QuotaDetails, Quota} from '@shared/entity/quota';
import {KmValidators} from '@shared/validators/validators';
import {ControlsOf} from '@shared/model/shared';
import {Project} from '@shared/entity/project';

enum Error {
  Required = 'required',
  AtLeastOneRequired = 'atLeastOneRequired',
}

@Component({
  selector: 'km-admin-dialog',
  templateUrl: './template.html',
  styleUrls: ['./style.scss'],
})
export class ProjectQuotaDialogComponent implements OnInit, AfterContentChecked, OnDestroy {
  form: FormGroup<ControlsOf<Quota<number>>>;
  projects: Project[] = [];
  quotas: QuotaDetails[] = [];
  selectedQuota: QuotaDetails;

  Error = Error;

  private _unsubscribe = new Subject<void>();

  constructor(
    private readonly _dialogRef: MatDialogRef<ProjectQuotaDialogComponent>,
    private readonly _notificationService: NotificationService,
    private readonly _changeDetectorRef: ChangeDetectorRef,
    private readonly _projectService: ProjectService,
    private readonly _quotaService: QuotaService,
    private readonly _builder: FormBuilder
  ) {}

  get quotaGroup(): FormGroup<ControlsOf<QuotaVariables<number>>> {
    return this.form?.controls.quota;
  }

  ngOnInit(): void {
    this._initForm();
    this._getProjects();
    this._getQuotas();
  }

  ngAfterContentChecked(): void {
    this._changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }

  getObservable(): Observable<Record<string, never>> {
    if (this.form.invalid) return of(null);

    const formValue = this.form.value as Quota<number>;

    const quota: QuotaVariables = Object.fromEntries(
      Object.entries(formValue.quota)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => [k, v.toString()])
    );

    const update$ = this._quotaService.updateQuota(this.selectedQuota?.name, quota);

    const create$ = this._quotaService.createQuota({...formValue, quota});

    return (this.selectedQuota ? update$ : create$).pipe(
      finalize(() => {
        this._dialogRef.close(true);
        this._notificationService.success(
          `${this.selectedQuota ? 'Updated' : 'Created'} project quota for ${formValue.subjectName}`
        );
        this._quotaService.refreshQuotas();
      })
    );
  }

  private _getProjects(): void {
    this._projectService.projects.pipe(takeUntil(this._unsubscribe)).subscribe(projects => {
      this.projects = projects;
      this.form.controls.subjectName.enable();
    });
  }

  private _getQuotas(): void {
    this._quotaService.quotas.pipe(takeUntil(this._unsubscribe)).subscribe(quotas => {
      this.quotas = quotas;
    });
  }

  private _initForm(): void {
    const variableControl = () =>
      this._builder.control<number>(null, {
        validators: [Validators.min(1)],
      });

    this.form = this._builder.group<ControlsOf<Quota<number>>>({
      quota: this._builder.group<ControlsOf<QuotaVariables<number>>>(
        {
          cpu: variableControl(),
          memory: variableControl(),
          storage: variableControl(),
        },
        {validators: KmValidators.atLeastOneValidator}
      ),
      subjectKind: this._builder.control('project', {
        validators: Validators.required,
        nonNullable: true,
      }),
      subjectName: this._builder.control(
        {value: '', disabled: true},
        {validators: Validators.required, nonNullable: true}
      ),
    });

    this._subscribeToQuotaGroupChanges();
    this._subscribeToSubjectNameChanges();
  }

  private _subscribeToQuotaGroupChanges(): void {
    this.quotaGroup.valueChanges.pipe(takeUntil(this._unsubscribe)).subscribe(_ => {
      Object.values(this.quotaGroup.controls)
        .filter(({value}) => value === 0)
        .forEach(control => control.patchValue(null, {emitEvent: false}));
    });
  }

  private _subscribeToSubjectNameChanges(): void {
    this.form.controls.subjectName.valueChanges
      .pipe(
        filter(projectId => !!projectId),
        takeUntil(this._unsubscribe)
      )
      .subscribe(projectId => {
        this.selectedQuota = this.quotas.find(({subjectName}) => subjectName === projectId);
      });
  }
}
