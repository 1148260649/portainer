import { useStore } from 'zustand';
import { Check, CheckCircle } from 'lucide-react';
import { Formik, useField } from 'formik';
import _ from 'lodash';

import { Environment } from '@/react/portainer/environments/types';
import { notifySuccess } from '@/portainer/services/notifications';
import { addPlural } from '@/portainer/helpers/strings';
import { withReactQuery } from '@/react-tools/withReactQuery';
import { useTags } from '@/portainer/tags/queries';
import { TagId } from '@/portainer/tags/types';
import { useGroups } from '@/react/portainer/environments/environment-groups/queries';
import { EnvironmentGroupId } from '@/react/portainer/environments/environment-groups/types';
import { useEdgeGroups } from '@/react/edge/edge-groups/queries/useEdgeGroups';
import { EdgeGroup } from '@/react/edge/edge-groups/types';

import { Datatable as GenericDatatable } from '@@/datatables';
import { Button } from '@@/buttons';
import { TextTip } from '@@/Tip/TextTip';
import { createPersistedStore } from '@@/datatables/types';
import { useSearchBarState } from '@@/datatables/SearchBar';
import { TooltipWithChildren } from '@@/Tip/TooltipWithChildren';
import { Modal, OnSubmit, openModal } from '@@/modals';
import { FormControl } from '@@/form-components/FormControl';
import { Checkbox } from '@@/form-components/Checkbox';
import { Select } from '@@/form-components/ReactSelect';
import { Option } from '@@/form-components/PortainerSelect';

import { WaitingRoomEnvironment } from '../types';
import { useAssociateDeviceMutation, useLicenseOverused } from '../queries';

import { useEnvironments } from './useEnvironments';
import { Filter } from './Filter';
import { columns } from './columns';

const storageKey = 'edge-devices-waiting-room';

const settingsStore = createPersistedStore(storageKey, 'Name');

export function Datatable() {
  const associateMutation = useAssociateDeviceMutation();
  const licenseOverused = useLicenseOverused();
  const settings = useStore(settingsStore);
  const [search, setSearch] = useSearchBarState(storageKey);
  const { data: environments, totalCount, isLoading } = useEnvironments();

  return (
    <GenericDatatable
      columns={columns}
      dataset={environments}
      initialPageSize={settings.pageSize}
      onPageSizeChange={settings.setPageSize}
      initialSortBy={settings.sortBy}
      onSortByChange={settings.setSortBy}
      searchValue={search}
      onSearchChange={setSearch}
      title="Edge Devices Waiting Room"
      emptyContentLabel="No Edge Devices found"
      renderTableActions={(selectedRows) => (
        <>
          <TooltipWithChildren message="Associate device(s) and assigning edge groups, group and tags with overriding options">
            <span>
              <Button
                onClick={() => handleAssociateAndAssign(selectedRows)}
                disabled={selectedRows.length === 0 || licenseOverused}
                color="secondary"
                icon={CheckCircle}
              >
                Associate and assignment
              </Button>
            </span>
          </TooltipWithChildren>

          <TooltipWithChildren message="Associate device(s) based on their pre-assigned edge groups, group and tags">
            <span>
              <Button
                onClick={() => handleAssociateDevice(selectedRows)}
                disabled={selectedRows.length === 0 || licenseOverused}
                icon={Check}
              >
                Associate Device
              </Button>
            </span>
          </TooltipWithChildren>

          {licenseOverused ? (
            <div className="ml-2 mt-2">
              <TextTip color="orange">
                Associating devices is disabled as your node count exceeds your
                license limit
              </TextTip>
            </div>
          ) : null}
        </>
      )}
      isLoading={isLoading}
      totalCount={totalCount}
      description={<Filter />}
    />
  );

  async function handleAssociateAndAssign(
    environments: WaitingRoomEnvironment[]
  ) {
    await openModal(withReactQuery(AssignmentDialog), { environments });
  }

  function handleAssociateDevice(devices: Environment[]) {
    associateMutation.mutate(
      devices.map((d) => d.Id),
      {
        onSuccess() {
          notifySuccess('Success', 'Edge devices associated successfully');
        },
      }
    );
  }
}

function AssignmentDialog({
  onSubmit,
  environments,
}: {
  onSubmit: OnSubmit<never>;
  environments: Array<WaitingRoomEnvironment>;
}) {
  const hasPreAssignedEdgeGroups = environments.some(
    (e) => e.EdgeGroups?.length > 0
  );
  const hasPreAssignedTags = environments.some((e) => e.TagIds.length > 0);
  const hasPreAssignedGroup = environments.some((e) => e.GroupId > 1);

  return (
    <Modal
      aria-label="Associate and assignment"
      onDismiss={() => onSubmit()}
      size="lg"
    >
      <Modal.Header
        title={`Associate with assignment (${addPlural(
          environments.length,
          'selected edge environment'
        )})`}
      />
      <Formik
        onSubmit={() => {}}
        initialValues={{
          group: 0,
          edgeGroups: [],
          tags: [] as Array<TagId | string>,
          overrideGroup: false,
          overrideEdgeGroups: false,
          overrideTags: false,
        }}
      >
        {({ values, setFieldValue, errors }) => (
          <Modal.Body>
            <div className="form-horizontal">
              <FormControl
                label="Group"
                tooltip="For managing RBAC with user access"
                size="vertical"
                errors={errors.group}
              >
                <GroupSelector />

                {hasPreAssignedGroup && (
                  <div className="mt-2">
                    <Checkbox
                      label="Override pre-assigned group"
                      id="overrideGroup"
                      bold={false}
                      checked={values.overrideGroup}
                      onChange={(e) =>
                        setFieldValue('overrideGroup', e.target.checked)
                      }
                    />
                  </div>
                )}
              </FormControl>

              <FormControl
                label="Edge Groups"
                tooltip="Required to manage edge job and edge stack deployments"
                size="vertical"
                errors={errors.edgeGroups}
              >
                <EdgeGroupsSelector />

                {hasPreAssignedEdgeGroups && (
                  <div className="mt-2">
                    <Checkbox
                      label="Override pre-assigned edge groups"
                      bold={false}
                      id="overrideEdgeGroups"
                      checked={values.overrideEdgeGroups}
                      onChange={(e) =>
                        setFieldValue('overrideEdgeGroups', e.target.checked)
                      }
                    />
                  </div>
                )}
              </FormControl>

              <div className="form-group">
                <div className="col-sm-12">
                  <TextTip color="blue">
                    Edge group(s) created here are static only, use tags to
                    assign to dynamic edge groups
                  </TextTip>
                </div>
              </div>

              <FormControl
                label="Tags"
                tooltip="Assigning tags will auto populate environments to dynamic edge groups that these tags are assigned to and any ege jobs or stacks that are deployed to that edge group"
                size="vertical"
                errors={errors.tags}
              >
                <TagSelector />

                {hasPreAssignedTags && (
                  <div className="mt-2">
                    <Checkbox
                      label="Override pre-assigned tags"
                      bold={false}
                      id="overrideTags"
                      checked={values.overrideTags}
                      onChange={(e) =>
                        setFieldValue('overrideTags', e.target.checked)
                      }
                    />
                  </div>
                )}
              </FormControl>
            </div>
          </Modal.Body>
        )}
      </Formik>
    </Modal>
  );
}

function GroupSelector() {
  const [{ onBlur, value }, , { setValue }] = useField<
    EnvironmentGroupId | string
  >('group');

  const groupsQuery = useGroups({
    select: (groups) =>
      groups.map((opt) => ({ label: opt.Name, value: opt.Id })),
  });

  if (!groupsQuery.data) {
    return null;
  }

  const groups = groupsQuery.data;
  const selectedValue =
    typeof value === 'number'
      ? groups.find((g) => g.value === value)
      : { value, label: value };

  return (
    <Select
      isCreatable
      options={groups}
      value={selectedValue}
      onCreateOption={handleCreate}
      onChange={handleChange}
      onBlur={onBlur}
    />
  );

  function handleCreate(newGroup: string) {
    setValue(newGroup);
  }

  function handleChange(value: { value: EnvironmentGroupId | string } | null) {
    setValue(value ? value.value : '');
  }
}

function TagSelector() {
  const tagsQuery = useTags({
    select: (tags) => tags.map((opt) => ({ label: opt.Name, value: opt.ID })),
  });

  if (!tagsQuery.data) {
    return null;
  }

  const tags = tagsQuery.data;

  return (
    <CreatableSelector
      name="tags"
      options={tags}
      isT={(t): t is TagId => typeof t === 'number'}
    />
  );
}

function EdgeGroupsSelector() {
  const edgeGroupsQuery = useEdgeGroups({
    select: (edgeGroups) =>
      edgeGroups.map((opt) => ({ label: opt.Name, value: opt.Id })),
  });

  if (!edgeGroupsQuery.data) {
    return null;
  }

  const edgeGroups = edgeGroupsQuery.data;

  return (
    <CreatableSelector
      name="edgeGroups"
      options={edgeGroups}
      isT={(t): t is EdgeGroup['Id'] => typeof t === 'number'}
    />
  );
}

function CreatableSelector<T>({
  name,
  options,
  isT,
}: {
  name: string;
  options: Array<Option<T | string>>;
  isT: (t: T | string) => t is T;
}) {
  const [{ onBlur, value }, , { setValue }] = useField<Array<T | string>>(name);

  const selectedValues = value.reduce(
    (acc: Array<{ label: string; value: T | string }>, cur) => {
      if (isT(cur)) {
        const tag = options.find((t) => t.value === cur);

        return _.compact([...acc, tag]);
      }

      return [...acc, { label: cur, value: cur }];
    },
    []
  );

  return (
    <Select
      isCreatable
      options={options}
      value={selectedValues}
      isMulti
      onCreateOption={handleCreate}
      onChange={handleChange}
      onBlur={onBlur}
    />
  );

  function handleCreate(newTag: string) {
    setValue([...value, newTag]);
  }

  function handleChange(value: ReadonlyArray<{ value: T | string }>) {
    setValue(value.map((v) => v.value));
  }
}
