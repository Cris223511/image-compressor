// arma el árbol de carpetas a partir de las rutas y lo aplana en filas para la lista virtual.

export interface FolderNode {
  type: 'folder'
  path: string
  name: string
  depth: number
  children: TreeNode[]
  /** ids de todas las imágenes que cuelgan de esta carpeta, a cualquier nivel */
  ids: string[]
}

export interface FileNode {
  type: 'file'
  id: string
  depth: number
}

export type TreeNode = FolderNode | FileNode

export function buildTree(entries: { id: string; path: string }[]): TreeNode[] {
  const roots: TreeNode[] = []
  const folders = new Map<string, FolderNode>()

  // el orden es el de llegada: nada se reordena por nombre ni se agrupan las carpetas primero
  for (const { id, path } of entries) {
    const parts = path.split('/')
    let siblings = roots
    let acc = ''
    const chain: FolderNode[] = []
    for (let d = 0; d < parts.length - 1; d++) {
      acc = acc ? `${acc}/${parts[d]}` : parts[d]
      let node = folders.get(acc)
      if (!node) {
        node = { type: 'folder', path: acc, name: parts[d], depth: d, children: [], ids: [] }
        folders.set(acc, node)
        siblings.push(node)
      }
      chain.push(node)
      siblings = node.children
    }
    for (const f of chain) f.ids.push(id)
    siblings.push({ type: 'file', id, depth: parts.length - 1 })
  }

  return roots
}

/** rutas de todas las carpetas del árbol, para abrirlas o cerrarlas todas de una vez */
export function folderPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = []
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.type === 'folder') {
        paths.push(n.path)
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return paths
}

/** el árbol en una sola lista, saltando lo que quede dentro de una carpeta cerrada */
export function flatten(nodes: TreeNode[], collapsed: Set<string>): TreeNode[] {
  const rows: TreeNode[] = []
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      rows.push(n)
      if (n.type === 'folder' && !collapsed.has(n.path)) walk(n.children)
    }
  }
  walk(nodes)
  return rows
}
