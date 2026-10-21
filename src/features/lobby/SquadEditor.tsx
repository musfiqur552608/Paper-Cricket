import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Plus, Trash2, Users } from 'lucide-react'
import { GAME_DEFAULTS } from '../../config/gameConfig'
import { useId } from 'react'

export function SquadEditor({
  squad,
  onChange,
  compact = false,
}: {
  squad: string[]
  onChange: (squad: string[]) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  const idBase = useId()

  function update(index: number, value: string) {
    onChange(squad.map((name, index2) => (index2 === index ? value : name)))
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...squad]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const temp = next[index] as string
    next[index] = next[target] as string
    next[target] = temp
    onChange(next)
  }

  function remove(index: number) {
    if (squad.length <= 1) return
    onChange(squad.filter((_, index2) => index2 !== index))
  }

  function add() {
    if (squad.length >= GAME_DEFAULTS.maxSquadSize) return
    onChange([...squad, `${t('lobby.playerN', { n: squad.length + 1 })}`])
  }

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            <Users size={13} /> {t('common.squad')}
            <span className="rounded-full bg-ink/10 px-1.5 text-[10px] text-ink">
              {squad.length}/{GAME_DEFAULTS.maxSquadSize}
            </span>
          </p>
          {!compact ? <p className="mt-0.5 text-[11.5px] text-slate-500">{t('lobby.squadHelp')}</p> : null}
        </div>
        <button
          type="button"
          onClick={add}
          disabled={squad.length >= GAME_DEFAULTS.maxSquadSize}
          className="btn-paper btn-sm shrink-0"
        >
          <Plus size={13} /> {t('lobby.addPlayer')}
        </button>
      </div>

      <ol className="space-y-1.5">
        {squad.map((name, index) => (
          <li key={`${idBase}-${index}`} className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-right font-hand text-sm text-ink/40">{index + 1}</span>
            <input
              className="input min-w-0 flex-1 py-2 text-[14px]"
              value={name}
              onChange={(event) => update(index, event.target.value)}
              maxLength={24}
              placeholder={t('lobby.playerN', { n: index + 1 })}
              aria-label={t('lobby.playerN', { n: index + 1 })}
            />
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                aria-label={t('lobby.moveUp')}
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="grid h-8 w-7 place-items-center rounded text-slate-400 hover:bg-ink/5 hover:text-ink disabled:opacity-20"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label={t('lobby.moveDown')}
                onClick={() => move(index, 1)}
                disabled={index === squad.length - 1}
                className="grid h-8 w-7 place-items-center rounded text-slate-400 hover:bg-ink/5 hover:text-ink disabled:opacity-20"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                aria-label={`${t('lobby.removePlayer')} ${index + 1}`}
                onClick={() => remove(index)}
                disabled={squad.length <= 1}
                className="grid h-8 w-7 place-items-center rounded text-slate-300 hover:bg-red-50 hover:text-pencil disabled:opacity-20"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
