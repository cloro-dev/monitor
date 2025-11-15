export default async function Page() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <h1 className="text-lg font-medium">Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your application settings and preferences.
        </p>

        <div className="space-y-6">
          <div>
            <h2 className="text-base font-medium mb-4">Appearance</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Theme settings will be available here soon.
            </p>
          </div>

          <div>
            <h2 className="text-base font-medium mb-4">Other Settings</h2>
            <p className="text-sm text-muted-foreground">
              Additional settings will be available here soon.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
