import { createAcl, defineAclRules } from 'vue-simple-acl'
const rules = (permissions: string[] = []) =>
  defineAclRules((setRule: any) => {
    permissions.forEach((permission: string) => {
      setRule(permission, () => true)
    })
  })
const simpleAcl = createAcl({
  rules
})

export { simpleAcl, rules }
