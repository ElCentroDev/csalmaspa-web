import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi, formatBytes, formatDateTime } from './adminApi.js'

const PROTECTED_PATHS = new Set([
  '',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'index.html',
  'src',
  'server',
  'public',
])

function parentFolderOf(relPath) {
  const idx = relPath.lastIndexOf('/')
  return idx >= 0 ? relPath.slice(0, idx) : ''
}

function getCursorPosition(textarea) {
  const pos = textarea?.selectionStart ?? 0
  const slice = (textarea?.value || '').slice(0, pos)
  const lines = slice.split('\n')
  return {
    line: lines.length,
    col: lines[lines.length - 1].length + 1,
  }
}

function TreeNode({
  entry,
  depth,
  expandedPaths,
  childrenByPath,
  loadingPaths,
  activeFilePath,
  onToggleDir,
  onSelectFile,
}) {
  const isDir = entry.type === 'dir'
  const isExpanded = isDir && expandedPaths.includes(entry.path)
  const isLoading = isDir && loadingPaths.includes(entry.path)
  const isSelected = !isDir && activeFilePath === entry.path
  const children = isDir ? childrenByPath[entry.path] || [] : []

  return (
    <li>
      <button
        type="button"
        className={`admin-tree-row${isSelected ? ' is-selected' : ''}`}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
        onClick={() => (isDir ? onToggleDir(entry.path) : onSelectFile(entry.path))}
      >
        <span className="admin-tree-caret" aria-hidden="true">
          {isDir ? (isExpanded ? '▾' : '▸') : '·'}
        </span>
        <span className="admin-tree-name">{entry.name}</span>
        {!isDir ? <span className="admin-tree-size">{formatBytes(entry.size)}</span> : null}
      </button>

      {isDir && isExpanded ? (
        <ul className="admin-tree-list">
          {isLoading ? (
            <li className="admin-tree-status" style={{ paddingLeft: `${30 + depth * 18}px` }}>
              Cargando...
            </li>
          ) : !children.length ? (
            <li className="admin-tree-status" style={{ paddingLeft: `${30 + depth * 18}px` }}>
              Carpeta vacía
            </li>
          ) : (
            children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                expandedPaths={expandedPaths}
                childrenByPath={childrenByPath}
                loadingPaths={loadingPaths}
                activeFilePath={activeFilePath}
                onToggleDir={onToggleDir}
                onSelectFile={onSelectFile}
              />
            ))
          )}
        </ul>
      ) : null}
    </li>
  )
}

function AdminFilesModule() {
  const [roots, setRoots] = useState([])
  const [activeRoot, setActiveRoot] = useState('project')
  const [childrenByPath, setChildrenByPath] = useState({})
  const [expandedPaths, setExpandedPaths] = useState([])
  const [loadingPaths, setLoadingPaths] = useState([])
  const [loadingRoot, setLoadingRoot] = useState(true)

  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)
  const [saving, setSaving] = useState(false)

  const [createMode, setCreateMode] = useState('')
  const [createPath, setCreatePath] = useState('')
  const [creating, setCreating] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, col: 1 })
  const [feedback, setFeedback] = useState(null)

  const gutterRef = useRef(null)
  const editorRef = useRef(null)

  useEffect(() => {
    let active = true
    adminApi
      .getFileRoots()
      .then((rootsData) => {
        if (!active) return
        const available = rootsData.roots || []
        setRoots(available)
        const initialRoot = available[0]?.id || 'project'
        setActiveRoot(initialRoot)
        return adminApi.listFiles(initialRoot, '').then((treeData) => {
          if (!active) return
          setChildrenByPath({ '': treeData.entries || [] })
        })
      })
      .catch((error) => {
        if (active) setFeedback({ type: 'error', text: error.message })
      })
      .finally(() => {
        if (active) setLoadingRoot(false)
      })

    return () => {
      active = false
    }
  }, [])

  const currentRootObj = roots.find((r) => r.id === activeRoot)
  const isRootWritable = Boolean(currentRootObj?.writable)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null
  const isDirty = Boolean(
    activeTab && activeTab.kind === 'text' && activeTab.content !== activeTab.originalContent,
  )
  const canEditActiveTab = Boolean(
    activeTab &&
      activeTab.writable &&
      activeTab.kind === 'text' &&
      !activeTab.truncated &&
      activeTab.path !== 'package-lock.json',
  )
  const canDeleteActiveTab = Boolean(
    activeTab && activeTab.writable && !PROTECTED_PATHS.has(activeTab.path),
  )

  const refreshDirectory = useCallback(
    async (rootId, dirPath) => {
      try {
        const data = await adminApi.listFiles(rootId, dirPath)
        setChildrenByPath((prev) => ({
          ...prev,
          [dirPath]: data.entries || [],
        }))
      } catch {
        // Ignora errores transitorios al refrescar una subcarpeta.
      }
    },
    [],
  )

  const switchRoot = async (rootId) => {
    setActiveRoot(rootId)
    setExpandedPaths([])
    setCreateMode('')
    setCreatePath('')
    setConfirmDelete(false)
    setFeedback(null)
    setLoadingRoot(true)
    try {
      const data = await adminApi.listFiles(rootId, '')
      setChildrenByPath({ '': data.entries || [] })
    } catch (error) {
      setChildrenByPath({ '': [] })
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setLoadingRoot(false)
    }
  }

  const handleToggleDir = async (dirPath) => {
    if (expandedPaths.includes(dirPath)) {
      setExpandedPaths((prev) => prev.filter((item) => item !== dirPath))
      return
    }

    setExpandedPaths((prev) => [...prev, dirPath])
    if (childrenByPath[dirPath]) return

    setLoadingPaths((prev) => [...prev, dirPath])
    setFeedback(null)
    try {
      const data = await adminApi.listFiles(activeRoot, dirPath)
      setChildrenByPath((prev) => ({
        ...prev,
        [dirPath]: data.entries || [],
      }))
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setLoadingPaths((prev) => prev.filter((item) => item !== dirPath))
    }
  }

  const openFileTab = async (filePath, rootOverride = activeRoot) => {
    const tabId = `${rootOverride}:${filePath}`
    setConfirmDelete(false)
    setFeedback(null)

    const existingTab = tabs.find((tab) => tab.id === tabId)
    if (existingTab) {
      setActiveTabId(tabId)
      setCursor({ line: 1, col: 1 })
      return
    }

    setLoadingFile(true)
    try {
      const data = await adminApi.previewFile(rootOverride, filePath)
      const rootMeta = roots.find((r) => r.id === rootOverride)
      const newTab = {
        id: tabId,
        root: rootOverride,
        writable: Boolean(rootMeta?.writable),
        path: data.path,
        name: data.name,
        kind: data.kind,
        size: data.size,
        modifiedAt: data.modifiedAt,
        originalContent: data.kind === 'text' ? data.content : '',
        content: data.kind === 'text' ? data.content : '',
        truncated: Boolean(data.truncated),
        previewUrl: data.previewUrl || '',
        message: data.message || '',
      }
      setTabs((prev) => [...prev, newTab])
      setActiveTabId(tabId)
      setCursor({ line: 1, col: 1 })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setLoadingFile(false)
    }
  }

  const closeTab = (tabId, event) => {
    if (event) event.stopPropagation()
    setConfirmDelete(false)
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId)
      const next = prev.filter((t) => t.id !== tabId)
      if (activeTabId === tabId) {
        const fallback = next[Math.min(idx, next.length - 1)]
        setActiveTabId(fallback ? fallback.id : '')
      }
      return next
    })
  }

  const updateActiveContent = (nextContent) => {
    if (!activeTab) return
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTab.id ? { ...tab, content: nextContent } : tab)),
    )
  }

  const handleSave = async () => {
    if (!activeTab || !canEditActiveTab || saving) return
    setSaving(true)
    setFeedback(null)
    try {
      const res = await adminApi.saveFileContent({
        root: activeTab.root,
        path: activeTab.path,
        content: activeTab.content,
      })
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTab.id
            ? {
                ...tab,
                originalContent: tab.content,
                size: res.file?.size ?? tab.size,
                modifiedAt: res.file?.modifiedAt ?? tab.modifiedAt,
              }
            : tab,
        ),
      )
      setFeedback({ type: 'success', text: `Guardado ${activeTab.path}.` })
      refreshDirectory(activeTab.root, parentFolderOf(activeTab.path))
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    if (!activeTab) return
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab.id ? { ...tab, content: tab.originalContent } : tab,
      ),
    )
    setFeedback(null)
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    if (!createMode || !createPath.trim()) return
    setCreating(true)
    setFeedback(null)
    try {
      const cleanPath = createPath.trim().replace(/^\/+/, '')
      const res = await adminApi.createFileEntry({
        root: activeRoot,
        path: cleanPath,
        type: createMode,
        content: '',
      })
      const created = res.entry
      const parent = parentFolderOf(created.path)
      await refreshDirectory(activeRoot, parent)
      if (parent && !expandedPaths.includes(parent)) {
        setExpandedPaths((prev) => [...prev, parent])
      }
      setCreateMode('')
      setCreatePath('')
      setFeedback({
        type: 'success',
        text: `${createMode === 'dir' ? 'Carpeta' : 'Archivo'} "${created.path}" creado.`,
      })
      if (createMode === 'file') {
        await openFileTab(created.path, activeRoot)
      }
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteActiveFile = async () => {
    if (!activeTab || !canDeleteActiveTab) return
    setFeedback(null)
    try {
      await adminApi.deleteFileEntry(activeTab.root, activeTab.path)
      const removedPath = activeTab.path
      const removedRoot = activeTab.root
      setConfirmDelete(false)
      closeTab(activeTab.id)
      await refreshDirectory(removedRoot, parentFolderOf(removedPath))
      setFeedback({ type: 'success', text: `Archivo "${removedPath}" eliminado.` })
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    }
  }

  const handleEditorKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      handleSave()
      return
    }
    if (event.key === 'Tab' && canEditActiveTab) {
      event.preventDefault()
      const el = event.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const nextValue = `${el.value.slice(0, start)}  ${el.value.slice(end)}`
      updateActiveContent(nextValue)
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = start + 2
          editorRef.current.selectionEnd = start + 2
          setCursor(getCursorPosition(editorRef.current))
        }
      })
    }
  }

  const syncScroll = (event) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = event.currentTarget.scrollTop
    }
  }

  const rootEntries = childrenByPath[''] || []
  const editorLines = activeTab?.kind === 'text' ? activeTab.content.split(/\r?\n/) : []
  const activePathForTree = activeTab && activeTab.root === activeRoot ? activeTab.path : ''

  return (
    <div className="admin-stack">
      <div className="admin-toolbar">
        <div className="admin-filter-tabs" role="tablist" aria-label="Raíces de exploración">
          {roots.map((root) => (
            <button
              key={root.id}
              type="button"
              role="tab"
              aria-selected={activeRoot === root.id}
              className={`admin-filter-tab${activeRoot === root.id ? ' is-active' : ''}`}
              onClick={() => switchRoot(root.id)}
            >
              <span>{root.label}</span>
              {!root.exists ? <span className="admin-filter-count">Vacío</span> : null}
            </button>
          ))}
        </div>

        <div className="admin-toolbar-actions">
          <span className={`admin-pill ${isRootWritable ? 'admin-pill--respondida' : 'admin-pill--leida'}`}>
            {isRootWritable ? 'Modo IDE (lectura/escritura)' : 'Solo lectura'}
          </span>
          {isRootWritable ? (
            <>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => {
                  setCreateMode((m) => (m === 'file' ? '' : 'file'))
                  setCreatePath('')
                }}
              >
                + Nuevo archivo
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => {
                  setCreateMode((m) => (m === 'dir' ? '' : 'dir'))
                  setCreatePath('')
                }}
              >
                + Nueva carpeta
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => switchRoot(activeRoot)}
          >
            Recargar árbol
          </button>
        </div>
      </div>

      {createMode ? (
        <form className="admin-card admin-ide-create-bar" onSubmit={handleCreateSubmit}>
          <label htmlFor="ide-create-path">
            {createMode === 'file' ? 'Ruta del nuevo archivo:' : 'Ruta de la nueva carpeta:'}
          </label>
          <input
            id="ide-create-path"
            type="text"
            className="admin-input"
            required
            maxLength={240}
            placeholder={createMode === 'file' ? 'Ej: src/utils/notas.js' : 'Ej: src/utils'}
            value={createPath}
            onChange={(event) => setCreatePath(event.target.value)}
          />
          <button type="submit" className="admin-btn admin-btn--primary" disabled={creating}>
            {creating ? 'Creando...' : 'Crear'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => {
              setCreateMode('')
              setCreatePath('')
            }}
          >
            Cancelar
          </button>
        </form>
      ) : null}

      {feedback ? <div className={`admin-banner admin-banner--${feedback.type}`}>{feedback.text}</div> : null}

      <div className="admin-files-grid">
        <section className="admin-card admin-tree-panel" aria-label="Árbol de directorios">
          <div className="admin-tree-header">
            <strong>Explorador</strong>
            <span className="admin-muted-tag" title={currentRootObj?.path || ''}>
              {currentRootObj?.label || activeRoot}
            </span>
          </div>

          {loadingRoot ? (
            <p className="admin-empty">Leyendo estructura...</p>
          ) : !rootEntries.length ? (
            <p className="admin-empty">No hay archivos visibles en esta raíz.</p>
          ) : (
            <ul className="admin-tree-list">
              {rootEntries.map((entry) => (
                <TreeNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  expandedPaths={expandedPaths}
                  childrenByPath={childrenByPath}
                  loadingPaths={loadingPaths}
                  activeFilePath={activePathForTree}
                  onToggleDir={handleToggleDir}
                  onSelectFile={(filePath) => openFileTab(filePath, activeRoot)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card admin-ide-panel" aria-label="Editor IDE de archivos">
          {tabs.length ? (
            <div className="admin-ide-tabs" role="tablist" aria-label="Archivos abiertos">
              {tabs.map((tab) => {
                const dirty = tab.kind === 'text' && tab.content !== tab.originalContent
                return (
                  <div
                    key={tab.id}
                    className={`admin-ide-tab${tab.id === activeTabId ? ' is-active' : ''}`}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab.id === activeTabId}
                      className="admin-ide-tab-btn"
                      onClick={() => {
                        setActiveTabId(tab.id)
                        setConfirmDelete(false)
                      }}
                      title={tab.path}
                    >
                      <span>{tab.name}</span>
                      {dirty ? <span className="admin-ide-dirty-dot" title="Sin guardar">●</span> : null}
                    </button>
                    <button
                      type="button"
                      className="admin-ide-tab-close"
                      aria-label={`Cerrar pestaña ${tab.name}`}
                      onClick={(event) => closeTab(tab.id, event)}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          ) : null}

          {loadingFile && !activeTab ? (
            <p className="admin-empty" style={{ padding: '24px' }}>
              Abriendo archivo...
            </p>
          ) : !activeTab ? (
            <div className="admin-empty-box">
              <h3>Editor IDE integrado</h3>
              <p>
                Haz clic en cualquier archivo del árbol para abrirlo en pestañas. Dentro de{' '}
                <strong>Proyecto React</strong> puedes editar, guardar cambios con <code>Ctrl+S</code>, crear archivos nuevos o borrar archivos temporales.
              </p>
            </div>
          ) : (
            <div className="admin-ide-body">
              <header className="admin-ide-toolbar">
                <div className="admin-ide-breadcrumb">
                  <span className="admin-preview-path">{activeTab.path}</span>
                  {!activeTab.writable ? (
                    <span className="admin-muted-tag">Solo lectura</span>
                  ) : null}
                </div>

                <div className="admin-actions-inline">
                  {canEditActiveTab ? (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        disabled={!isDirty || saving}
                        onClick={handleSave}
                      >
                        {saving ? 'Guardando...' : 'Guardar (Ctrl+S)'}
                      </button>
                      {isDirty ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={handleDiscard}
                        >
                          Descartar
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  {canDeleteActiveTab ? (
                    confirmDelete ? (
                      <div className="admin-confirm-inline">
                        <span>¿Eliminar archivo?</span>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          onClick={handleDeleteActiveFile}
                        >
                          Sí, eliminar
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger-ghost"
                        onClick={() => setConfirmDelete(true)}
                      >
                        Eliminar
                      </button>
                    )
                  ) : null}
                </div>
              </header>

              {activeTab.kind === 'text' ? (
                <>
                  {activeTab.truncated ? (
                    <div className="admin-hint">
                      Archivo mayor a 128 KB: abierto en modo solo lectura parcial para evitar bloqueos.
                    </div>
                  ) : null}
                  <div className="admin-ide-editor-wrap">
                    <div className="admin-ide-gutter" ref={gutterRef} aria-hidden="true">
                      {editorLines.map((_, idx) => (
                        <div key={idx}>{idx + 1}</div>
                      ))}
                    </div>
                    <textarea
                      ref={editorRef}
                      className="admin-ide-textarea"
                      aria-label={`Editor de ${activeTab.name}`}
                      spellCheck={false}
                      readOnly={!canEditActiveTab}
                      value={activeTab.content}
                      onChange={(event) => {
                        updateActiveContent(event.target.value)
                        setCursor(getCursorPosition(event.target))
                      }}
                      onClick={(event) => setCursor(getCursorPosition(event.currentTarget))}
                      onKeyUp={(event) => setCursor(getCursorPosition(event.currentTarget))}
                      onSelect={(event) => setCursor(getCursorPosition(event.currentTarget))}
                      onKeyDown={handleEditorKeyDown}
                      onScroll={syncScroll}
                    />
                  </div>
                </>
              ) : null}

              {activeTab.kind === 'image' ? (
                <div className="admin-image-preview-box">
                  {activeTab.previewUrl ? (
                    <img src={activeTab.previewUrl} alt={activeTab.name} />
                  ) : (
                    <p className="admin-empty">
                      Imagen binaria ({formatBytes(activeTab.size)}) fuera de las rutas web públicas.
                    </p>
                  )}
                </div>
              ) : null}

              {activeTab.kind === 'binary' ? (
                <p className="admin-empty" style={{ padding: '20px' }}>
                  {activeTab.message}
                </p>
              ) : null}

              <footer className="admin-ide-statusbar">
                <span>
                  {activeTab.kind === 'text'
                    ? `Ln ${cursor.line}, Col ${cursor.col} · ${editorLines.length} líneas`
                    : activeTab.kind === 'image'
                      ? 'Imagen'
                      : 'Binario'}
                </span>
                <span>{formatBytes(activeTab.size)}</span>
                <span>Modificado: {formatDateTime(activeTab.modifiedAt)}</span>
                <span>UTF-8</span>
                <span>{isDirty ? 'Sin guardar' : 'Guardado'}</span>
              </footer>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminFilesModule
