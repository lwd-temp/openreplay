import React from 'react'
import { Button, Checkbox, Input } from 'antd'

interface Props {
  onSave: (name: string, ignoreClRage: boolean, ignoreDeadCl: boolean) => void,
  hideModal: () => void
}

function SaveModal({ onSave, hideModal }: Props) {
  const [name, setName] = React.useState('');
  const [ignoreClRage, setIgnoreClRage] = React.useState(false);
  const [ignoreDeadCl, setIgnoreDeadCl] = React.useState(false);

  const save = () => {
    onSave(name, ignoreClRage, ignoreDeadCl );
    hideModal();
  }
  return (
    <div className={'h-screen bg-white p-4 flex flex-col gap-4'}>
      <div className={'font-semibold text-xl'}>Tag Element</div>
      <div className={'w-full border border-b-light-gray'} />
      <div>
        <div className={'font-semibold'}>Name</div>
        <Input
          placeholder={"E.g Buy Now Button"}
          className={'w-full'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <div className={'font-semibold'}>Ignore following actions on this element</div>
        <div className={'flex gap-2'}>
          <Checkbox
            checked={ignoreClRage}
            onChange={(e) => setIgnoreClRage(e.target.checked)}
          >
            Click Rage
          </Checkbox>
          <Checkbox
            checked={ignoreDeadCl}
            onChange={(e) => setIgnoreDeadCl(e.target.checked)}
          >
            Dead Click
          </Checkbox>
        </div>
      </div>
      <div className={'w-full border border-b-light-gray'} />
      <div className={'flex gap-2'}>
        <Button type={'primary'} disabled={name === ''} onClick={save}>
          Tag
        </Button>
        <Button type={'default'} disabled={name === ''}>
          Tag & Find Element
        </Button>
        <Button type={'primary'} ghost onClick={hideModal}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default SaveModal