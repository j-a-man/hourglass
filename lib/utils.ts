import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateJoinCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const numbers = "0123456789"
  const part1 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("")
  const part2 = Array.from({ length: 3 }, () => numbers[Math.floor(Math.random() * numbers.length)]).join("")
  return `HRG-${part1}-${part2}`
}
