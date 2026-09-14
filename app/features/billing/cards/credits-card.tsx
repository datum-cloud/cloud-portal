import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@datum-cloud/datum-ui/card';

interface CreditsCardProps {
  balance: string;
  onRedeem?: () => void;
  onTopUp?: () => void;
}

export const CreditsCard = ({ balance, onRedeem, onTopUp }: CreditsCardProps) => {
  return (
    <Card size="sm" sectioned>
      <CardContent className="flex flex-col gap-2">
        <CardTitle className="text-sm">Balance</CardTitle>
        <p className="text-foreground text-2xl font-medium">{balance}</p>
      </CardContent>
      <CardFooter bordered className="flex justify-end gap-2">
        <Button
          disabled
          htmlType="button"
          type="quaternary"
          theme="outline"
          size="xs"
          onClick={onRedeem}>
          Redeem code
        </Button>
        <Button
          disabled
          htmlType="button"
          type="quaternary"
          theme="outline"
          size="xs"
          onClick={onTopUp}>
          Top up
        </Button>
      </CardFooter>
    </Card>
  );
};
