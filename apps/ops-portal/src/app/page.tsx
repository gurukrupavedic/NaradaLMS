import { Button } from "@narada/ui";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
      <h1 className="text-4xl font-bold">Ops Portal</h1>
      <p className="text-xl text-muted-foreground">Internal Operations Dashboard</p>
      <div className="flex gap-4">
        <Button>Login to Admin</Button>
        <Button variant="outline">Documentation</Button>
      </div>
    </div>
  );
}
