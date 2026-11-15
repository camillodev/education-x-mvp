import type * as UnitContextModule from "@/lib/auth/unit-context";

type Actual = typeof UnitContextModule;
type GetUnitContext = () => Promise<UnitContextModule.UnitContext>;

// The real requireSchoolAdmin calls the module's own getUnitContext, which a mock of the export
// cannot reach. Route tests keep driving the session through their getUnitContext mock and use
// this to get a requireSchoolAdmin with the same role rule.
export function withSchoolAdmin(actual: Actual, getUnitContext: GetUnitContext) {
  return {
    ...actual,
    getUnitContext,
    requireSchoolAdmin: async () => {
      const ctx = await getUnitContext();
      if (ctx.role !== "orientador") throw new actual.ForbiddenError();
      return ctx;
    },
  };
}
