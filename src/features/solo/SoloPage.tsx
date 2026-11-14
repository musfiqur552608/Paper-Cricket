import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CoinToss, type TossWinner } from '../../components/ui/CoinToss'
import { MatchPage } from '../match/MatchPage'
import { ResultPage } from '../result/ResultPage'
import { useSoloMatch } from '../../hooks/useSoloMatch'
import { usePreferences } from '../../store/preferences'
import { CPU_SQUADS, DEFAULT_SQUADS, makeSquadNames } from '../../config/gameConfig'
import { SOLO_HUMAN_ID, type SoloBattingFirst, type SoloConfig } from '../../lib/soloEngine'
import { SoloSetup, type SoloSetupValues } from './SoloSetup'

interface SoloGameState {
  config: SoloConfig
  key: number
}

interface TossState {
  config: SoloConfig
  winner: TossWinner
  phase: 'flipping' | 'result'
}

export function SoloPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const reducedMotion = usePreferences((state) => state.reducedMotion)
  const [setup, setSetup] = useState<SoloSetupValues | null>(null)
  const [game, setGame] = useState<SoloGameState | null>(null)
  const [toss, setToss] = useState<TossState | null>(null)

  const buildConfig = useCallback(
    (values: SoloSetupValues, first: SoloBattingFirst): SoloConfig => {
      const isBn = i18n.language.startsWith('bn')
      const humanSquad = makeSquadNames(
        isBn ? DEFAULT_SQUADS.bn : DEFAULT_SQUADS.en,
        values.wickets,
        (position) => t('lobby.playerN', { n: position }),
      )
      const botSquad = makeSquadNames(
        isBn ? CPU_SQUADS.bn : CPU_SQUADS.en,
        values.wickets,
        (position) => t('solo.cpuPlayerN', { n: position }),
      )
      return {
        humanName: values.name,
        humanTeam: values.teamName,
        botName: t('solo.cpuName'),
        botTeam: t('solo.cpuTeam'),
        overs: values.overs,
        wickets: values.wickets,
        batFirst: first,
        difficulty: values.difficulty,
        superOver: true,
        humanSquad,
        botSquad,
      }
    },
    [i18n.language, t],
  )

  const begin = useCallback(
    (values: SoloSetupValues) => {
      const first: SoloBattingFirst =
        values.batFirst === 'toss' ? (Math.random() < 0.5 ? 'human' : 'cpu') : values.batFirst
      const config = buildConfig(values, first)
      setSetup(values)
      try {
        window.localStorage.setItem('pc.name', values.name)
        window.localStorage.setItem('pc.team', values.teamName)
      } catch {
        // Private mode is fine; only the memory of the name is lost.
      }

      if (values.batFirst === 'toss' && !reducedMotion) {
        setToss({
          config,
          phase: 'flipping',
          winner: {
            side: first === 'human' ? 'host' : 'guest',
            name: first === 'human' ? config.humanName : config.botName,
            team: first === 'human' ? config.humanTeam : config.botTeam,
          },
        })
        return
      }

      setToss(null)
      setGame({ config, key: Date.now() })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [buildConfig, reducedMotion],
  )

  // Coin toss is local and harmless: flip, show the result, then mount the
  // actual local match. Reduced-motion players skip straight to the first ball.
  useEffect(() => {
    if (!toss) return
    const timer = window.setTimeout(
      () => {
        if (toss.phase === 'flipping') {
          setToss((current) => (current ? { ...current, phase: 'result' } : null))
          return
        }
        setGame({ config: toss.config, key: Date.now() })
        setToss(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      toss.phase === 'flipping' ? 1550 : 2200,
    )
    return () => window.clearTimeout(timer)
  }, [toss])

  const rematch = useCallback(() => {
    if (!setup) return
    begin(setup)
  }, [begin, setup])

  const changeSetup = useCallback(() => {
    setToss(null)
    setGame(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const exit = useCallback(() => navigate('/'), [navigate])

  return (
    <>
      {game ? (
        <SoloGame
          key={game.key}
          config={game.config}
          onRematch={rematch}
          onChangeSetup={changeSetup}
        />
      ) : (
        <SoloSetup initial={setup} onStart={begin} onBack={exit} />
      )}

      <CoinToss
        open={Boolean(toss)}
        winner={toss?.winner ?? null}
        phase={toss?.phase ?? 'flipping'}
        resultText={
          toss?.winner.side === 'host'
            ? t('solo.tossHuman')
            : toss
              ? t('solo.tossCpu')
              : undefined
        }
      />
    </>
  )
}

function SoloGame({
  config,
  onRematch,
  onChangeSetup,
}: {
  config: SoloConfig
  onRematch: () => void
  onChangeSetup: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { snapshot, actions } = useSoloMatch(config)
  const finished = snapshot.room.status !== 'live'
  const refresh = useCallback(async () => {}, [])
  const leave = useCallback(async () => {
    navigate('/')
  }, [navigate])

  useEffect(() => {
    const previous = document.title
    document.title = `${t('solo.practiceBadge')} · ${t('common.appName')}`
    return () => {
      document.title = previous
    }
  }, [t])

  useEffect(() => {
    if (finished) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [finished])

  if (finished) {
    return (
      <ResultPage
        snapshot={snapshot}
        userId={SOLO_HUMAN_ID}
        onLeave={leave}
        solo
        onRematch={onRematch}
        onChangeSetup={onChangeSetup}
      />
    )
  }

  return (
    <MatchPage
      snapshot={snapshot}
      userId={SOLO_HUMAN_ID}
      opponentOnline
      presenceReady
      refresh={refresh}
      onLeave={leave}
      actions={actions}
      mode="solo"
    />
  )
}
