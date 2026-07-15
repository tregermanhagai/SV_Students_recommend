import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/hooks/useLocale'

interface Props {
  onUploaded: (url: string) => void
}

export default function ImageUploader({ onUploaded }: Props) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploadError(null)
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('recommendation-images')
      .upload(path, file, { upsert: true })
    if (error) {
      setUploadError(error.message)
      setPreview(null)
    } else {
      const { data } = supabase.storage.from('recommendation-images').getPublicUrl(path)
      onUploaded(data.publicUrl)
    }
    setUploading(false)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="relative w-full aspect-video bg-card border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden active:opacity-80"
    >
      {preview ? (
        <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <>
          <span className="text-3xl">📷</span>
          <span className="text-slate-400 text-sm mt-1">{t('addImage')}</span>
        </>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <span className="text-white text-sm">{t('uploadingImage')}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
    {uploadError && (
      <p className="text-red-400 text-xs mt-1">Upload failed: {uploadError}</p>
    )}
  )
}
