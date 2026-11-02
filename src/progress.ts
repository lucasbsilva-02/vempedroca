import type { Progress } from './types'
const KEY = 'vp:progress:v1', SND = 'vp:sound'
export function loadProgress(): Progress { try { const p = JSON.parse(localStorage.getItem(KEY) || ''); if (p && p.levels) return p } catch { /* dados inválidos: recomeça */ } return { levels: {} } }
export function saveProgress(p: Progress) { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* armazenamento indisponível */ } }
export const loadSound = () => { try { return localStorage.getItem(SND) !== 'off' } catch { return true } }
export const saveSound = (on: boolean) => { try { localStorage.setItem(SND, on ? 'on' : 'off') } catch { /* ignora */ } }
