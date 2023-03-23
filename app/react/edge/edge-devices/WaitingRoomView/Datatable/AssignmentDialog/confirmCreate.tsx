import { ModalType } from '@@/modals';
import { confirm } from '@@/modals/confirm';

export function confirmCreation({
  edgeGroups,
  tags,
  group,
}: {
  edgeGroups: Array<string>;
  tags: Array<string>;
  group?: string;
}) {
  return confirm({
    title: 'Are you sure?',
    modalType: ModalType.Warn,
    message: (
      <>
        <p>You&apos;re are about to create these when associate device:</p>

        <ul className="ml-4">
          {edgeGroups.length > 0 &&
            renderItem('Static edge groups', edgeGroups.join(','))}

          {tags.length > 0 && renderItem('Tags', tags.join(','))}

          {group && renderItem('Group', group)}
        </ul>
      </>
    ),
  });

  function renderItem(title: string, value: string) {
    return (
      <li>
        {title}: <b>{value}</b>
      </li>
    );
  }
}
