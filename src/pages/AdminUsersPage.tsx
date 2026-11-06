import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { AdminUser } from '../api/types'
import { useAuth } from '../auth/AuthContext'

// View of GET /user/list, with per-row delete via DELETE /user/{uid}. No role
// column: the `admin` field this endpoint returns is not populated (false even
// for known admins).

type SortKey = 'fullName' | 'uid' | 'mail' | 'organization' | 'enabled'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'fullName', label: 'Name' },
  { key: 'uid', label: 'Username' },
  { key: 'mail', label: 'Email' },
  { key: 'organization', label: 'Organization' },
  { key: 'enabled', label: 'Status' },
]

function compare(a: AdminUser, b: AdminUser, key: SortKey): number {
  // Active sorts before Inactive when ascending
  if (key === 'enabled') return Number(b.enabled) - Number(a.enabled)
  return (a[key] ?? '').localeCompare(b[key] ?? '', undefined, { sensitivity: 'base' })
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [inactiveOnly, setInactiveOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('uid')
  const [sortAsc, setSortAsc] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { user: me } = useAuth()

  async function deleteUser(u: AdminUser) {
    if (!window.confirm(`Delete user "${u.uid}"? This cannot be undone.`)) return
    setDeleting(u.uid)
    setError(null)
    try {
      await api.deleteUser(u.uid)
      setUsers((prev) => prev.filter((x) => x.uid !== u.uid))
    } catch (e) {
      const status = (e as { status?: number }).status
      setError(
        status === 403
          ? `You are not allowed to delete "${u.uid}".`
          : status === 404
            ? `User "${u.uid}" was not found.`
            : `Could not delete "${u.uid}".`,
      )
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listUsers()
        if (!cancelled) setUsers(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setError('Could not load the user list.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = users.filter((u) => {
      if (inactiveOnly && u.enabled) return false
      if (!q) return true
      return [u.fullName, u.uid, u.mail].some((v) => (v ?? '').toLowerCase().includes(q))
    })
    rows.sort((a, b) => (sortAsc ? 1 : -1) * compare(a, b, sortKey))
    return rows
  }, [users, search, inactiveOnly, sortKey, sortAsc])

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((asc) => !asc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const inactiveCount = users.filter((u) => !u.enabled).length

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-12">
          <div className="page-header">
            <h2>Users</h2>
          </div>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <div className="row" style={{ marginBottom: 15 }}>
            <div className="col-sm-5">
              <div className="input-group input-group-sm">
                <span className="input-group-addon">
                  <span className="glyphicon glyphicon-search" />
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search name, username or email"
                  aria-label="Search users"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-4">
              <div className="checkbox" style={{ margin: '5px 0 0' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={inactiveOnly}
                    onChange={(e) => setInactiveOnly(e.target.checked)}
                  />{' '}
                  Inactive accounts only ({inactiveCount})
                </label>
              </div>
            </div>
            <div className="col-sm-3 text-right text-muted" style={{ paddingTop: 5 }}>
              {loading ? 'Loading…' : `${shown.length} of ${users.length} users`}
            </div>
          </div>

          <table className="table table-striped table-condensed" width="100%">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    aria-sort={sortKey === c.key ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      className="btn btn-link"
                      style={{ padding: 0, fontWeight: 'bold' }}
                      onClick={() => sortBy(c.key)}
                    >
                      {c.label}
                      {sortKey === c.key ? (
                        <>
                          {' '}
                          <span
                            className={`glyphicon glyphicon-triangle-${sortAsc ? 'top' : 'bottom'}`}
                            aria-hidden="true"
                          />
                        </>
                      ) : null}
                    </button>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {!loading && shown.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center">
                    No items
                  </td>
                </tr>
              ) : null}
              {shown.map((u) => (
                <tr key={u.uid}>
                  <td>{u.fullName}</td>
                  <td>{u.uid}</td>
                  <td>{u.mail}</td>
                  <td>{u.organization}</td>
                  <td>
                    {u.enabled ? (
                      <span className="label label-success">Active</span>
                    ) : (
                      <span className="label label-default">Inactive</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      disabled={deleting !== null || u.uid === me?.username}
                      title={u.uid === me?.username ? 'You cannot delete your own account' : undefined}
                      onClick={() => deleteUser(u)}
                    >
                      <span className="glyphicon glyphicon-trash" aria-hidden="true" />{' '}
                      {deleting === u.uid ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
