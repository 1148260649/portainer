import { useCallback, useState } from 'react';
import { useField } from 'formik';

import { useGroups } from '@/react/portainer/environments/environment-groups/queries';
import { EnvironmentGroupId } from '@/react/portainer/environments/environment-groups/types';

import { Select } from '@@/form-components/ReactSelect';
import { Option } from '@@/form-components/PortainerSelect';

export function GroupSelector() {
  const [{ onBlur, value }, , { setValue }] = useField<
    EnvironmentGroupId | string
  >('group');

  const groupsQuery = useGroups({
    select: (groups) =>
      groups.map((opt) => ({ label: opt.Name, value: opt.Id })),
  });

  const { onInputChange } = useCreateOnBlur({
    options: groupsQuery.data || [],
    setValue,
  });

  if (!groupsQuery.data) {
    return null;
  }

  const options = groupsQuery.data;
  const selectedValue =
    typeof value === 'number'
      ? options.find((g) => g.value === value)
      : { value, label: value };

  return (
    <Select
      isCreatable
      options={options}
      value={selectedValue}
      onCreateOption={handleCreate}
      onChange={handleChange}
      onInputChange={onInputChange}
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

function useCreateOnBlur({
  options,
  setValue,
}: {
  options: Option<number | string>[];
  setValue: (value: number | string) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleBlur = useCallback(() => {
    const label = inputValue?.trim() || '';
    const option = options.find((opt) => opt.label === label);

    if (!label) {
      return;
    }

    setValue(option ? option.value : label);
  }, [inputValue, options, setValue]);

  const handleInputChange = useCallback(
    (inputValue, { action }) => {
      if (action === 'input-change') {
        setInputValue(inputValue);
      }
      if (action === 'input-blur') {
        handleBlur();
      }
    },
    [handleBlur]
  );

  return {
    onInputChange: handleInputChange,
  };
}
