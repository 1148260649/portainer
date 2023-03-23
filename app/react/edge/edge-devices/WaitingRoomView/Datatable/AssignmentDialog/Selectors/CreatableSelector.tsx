import { useField } from 'formik';
import _ from 'lodash';

import { Select } from '@@/form-components/ReactSelect';
import { Option } from '@@/form-components/PortainerSelect';

export function CreatableSelector<T>({
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
