import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';

export const AccountTeamAuthCard = () => {
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="gap-1 border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Two-factor Authentication</CardTitle>
        <CardDescription className="text-1xs">
          Add an additional layer of security by requiring at least two methods of authentication to
          sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <span className="text-1xs text-icon-primary/80">
          If any of your teams have SAML enabled you&apos;ll see them here to connect.
        </span>
      </CardContent>
    </Card>
  );
};
