// Copyright 2022 The Kubermatic Kubernetes Platform contributors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

type stringOrNumber = string | number;

export interface QuotaVariables<T extends stringOrNumber = string> {
  cpu?: T;
  memory?: T;
  storage?: T;
}

export interface Status {
  globalUsage: QuotaVariables | Record<string, never>;
  localUsage: QuotaVariables | Record<string, never>;
}

export interface Quota<T extends stringOrNumber = string> {
  quota: QuotaVariables<T>;
  subjectKind: string;
  subjectName: string;
}

export type QuotaDetails = Quota & {
  name: string;
  status: Status;
};
