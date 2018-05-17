import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AddNodeService } from '../../core/services/add-node/add-node.service';
import { Subscription } from 'rxjs/Subscription';
import { NodeProviderData } from '../../shared/model/NodeSpecChange';
import { CloudSpec } from '../../shared/entity/ClusterEntity';

@Component({
  selector: 'kubermatic-vsphere-add-node',
  templateUrl: './vsphere-add-node.component.html',
  styleUrls: ['./vsphere-add-node.component.scss']
})

export class VSphereAddNodeComponent implements OnInit, OnDestroy {
  @Input() public cloudSpec: CloudSpec;
  public defaultTemplate = 'ubuntu-template';
  public vsphereNodeForm: FormGroup = new FormGroup({
    cpu: new FormControl(1, [Validators.required, Validators.min(1)]),
    memory: new FormControl(512, [Validators.required, Validators.min(512)]),
    template: new FormControl('ubuntu-template'),
  });
  private subscriptions: Subscription[] = [];

  constructor(private addNodeService: AddNodeService) { }

  ngOnInit(): void {
    this.subscriptions.push(this.vsphereNodeForm.valueChanges.subscribe(data => {
      this.addNodeService.changeNodeProviderData(this.getNodeProviderData());
    }));

    this.subscriptions.push(this.addNodeService.nodeOperatingSystemDataChanges$.subscribe(data => {
      if (data.ubuntu) {
        if (this.vsphereNodeForm.controls.template.value === '' || this.vsphereNodeForm.controls.template.value === 'ubuntu-template' || this.vsphereNodeForm.controls.template.value === 'coreos_production_vmware_ova') {
          this.vsphereNodeForm.setValue({cpu: this.vsphereNodeForm.controls.cpu.value, memory: this.vsphereNodeForm.controls.memory.value, template: 'ubuntu-template'});
        }
        this.defaultTemplate = 'ubuntu-template';
      } else if (data.containerLinux) {
        if (this.vsphereNodeForm.controls.template.value === '' || this.vsphereNodeForm.controls.template.value === 'ubuntu-template' || this.vsphereNodeForm.controls.template.value === 'coreos_production_vmware_ova') {
          this.vsphereNodeForm.setValue({cpu: this.vsphereNodeForm.controls.cpu.value, memory: this.vsphereNodeForm.controls.memory.value, template: 'coreos_production_vmware_ova'});
        }
        this.defaultTemplate = 'coreos_production_vmware_ova';
      } else {
        this.defaultTemplate = 'ubuntu-template';
      }
    }));

    this.addNodeService.changeNodeProviderData(this.getNodeProviderData());
  }

  ngOnDestroy() {
    for (const sub of this.subscriptions) {
      if (sub) {
        sub.unsubscribe();
      }
    }
  }

  getNodeProviderData(): NodeProviderData {
    return {
      spec: {
        vsphere: {
          cpus: this.vsphereNodeForm.controls.cpu.value,
          memory: this.vsphereNodeForm.controls.memory.value,
          template: this.vsphereNodeForm.controls.template.value,
        },
      },
      valid: this.vsphereNodeForm.valid,
    };
  }
}
