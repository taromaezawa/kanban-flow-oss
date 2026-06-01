// app/components/Toast.tsx
'use client'
import { useCallback, useRef, useState } from 'react'

type Kind = 'error' | 'success'

/**
 * 軽量トースト。Provider を持たず、各クライアントコンポーネント内で
 *   const { toast, notify } = useToast()
 * のように使い、JSX 末尾に {toast} を描画、失敗/成功時に notify(...) を呼ぶ。
 * fetch のサイレント失敗（保存できていないのにUIだけ進む）をユーザーに伝えるのが目的。
 */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; kind: Kind } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback((text: string, kind: Kind = 'success') => {
    setMsg({ text, kind })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 3000)
  }, [])

  const toast = msg ? (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded shadow-lg text-sm text-white ${
        msg.kind === 'error' ? 'bg-red-600' : 'bg-gray-800'
      }`}
    >
      {msg.text}
    </div>
  ) : null

  return { toast, notify }
}
