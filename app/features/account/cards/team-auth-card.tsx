import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';

export const AccountTeamAuthCard = () => {
  return (
    <Card size="sm" sectioned>
      <CardHeader size="sm" bordered>
        <CardTitle className="text-sm">Team Authentication</CardTitle>
        <CardDescription className="text-2xs">
          Add an additional layer of security by requiring at least two methods of authentication to
          sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-2xs text-icon-primary/80">
          If any of your teams have SAML enabled you&apos;ll see them here to connect.
        </span>
      </CardContent>
    </Card>
  );
};
