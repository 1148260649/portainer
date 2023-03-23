import { useStore } from 'zustand';
import { Check, CheckCircle } from 'lucide-react';

import { Environment } from '@/react/portainer/environments/types';
import { notifySuccess } from '@/portainer/services/notifications';
import { withReactQuery } from '@/react-tools/withReactQuery';

import { Datatable as GenericDatatable } from '@@/datatables';
import { Button } from '@@/buttons';
import { TextTip } from '@@/Tip/TextTip';
import { createPersistedStore } from '@@/datatables/types';
import { useSearchBarState } from '@@/datatables/SearchBar';
import { TooltipWithChildren } from '@@/Tip/TooltipWithChildren';
import { openModal } from '@@/modals';

import { WaitingRoomEnvironment } from '../types';
import { useAssociateDeviceMutation, useLicenseOverused } from '../queries';

import { useEnvironments } from './useEnvironments';
import { Filter } from './Filter';
import { columns } from './columns';
import { AssignmentDialog } from './AssignmentDialog/AssignmentDialog';

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
    const assigned = await openModal(withReactQuery(AssignmentDialog), {
      environments,
    });

    if (!assigned) {
      return;
    }

    handleAssociateDevice(environments);
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
