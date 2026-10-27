import { Trash2 } from 'lucide-react';

export function AccessFields({ assignments, options, onChange }) {
  const selectedRoles = new Set(assignments.map((item) => item.roleId).filter(Boolean));
  const update = (index, patch) => onChange(assignments.map((item, row) => row === index ? { ...item, ...patch } : item));
  const remove = (index) => onChange(assignments.filter((_, row) => row !== index));
  return <div className="access-table table-wrap"><table><thead><tr><th>No</th><th>Role</th><th>Permission</th><th>Action</th></tr></thead><tbody>{assignments.map((assignment, index) => <tr key={assignment.key || index}><td>{index + 1}</td><td><select aria-label={`Role row ${index + 1}`} value={assignment.roleId} onChange={(event) => update(index, { roleId: event.target.value })} required><option value="">Select role</option>{options.roles.map((role) => <option key={role.id} value={role.id} disabled={selectedRoles.has(role.id) && role.id !== assignment.roleId}>{role.name}</option>)}</select></td><td><select aria-label={`Permission row ${index + 1}`} value={assignment.permissionId} onChange={(event) => update(index, { permissionId: event.target.value })} required><option value="">Select permission</option>{options.permissions.map((permission) => <option key={permission.id} value={permission.id}>{permission.name}</option>)}</select></td><td><button type="button" className="danger-link" onClick={() => remove(index)} disabled={assignments.length === 1}><Trash2 size={17} /> Remove</button></td></tr>)}</tbody></table></div>;
}
