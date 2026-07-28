import { Election, ElectionStatus } from '@prisma/client';

export interface ElectionWithComputed {
  election: Election;
  computedStatus: ElectionStatus;
  isRegistrationOpen: boolean;
  isCampaignActive: boolean;
  isVotingOpen: boolean;
  msUntilNextPhase: number | null;
}

export function computeElectionState(election: Election): ElectionWithComputed {
  const now = new Date();
  const regStart = new Date(election.registrationStart);
  const regEnd = new Date(election.registrationEnd);
  const campStart = new Date(election.campaignStart);
  const campEnd = new Date(election.campaignEnd);
  const voteStart = new Date(election.votingStart);
  const voteEnd = new Date(election.votingEnd);

  // Manual status (CLOSED or PUBLISHED) takes precedence
  let computedStatus: ElectionStatus = election.status;
  if (election.status === 'UPCOMING') {
    if (now >= voteStart && now < voteEnd) computedStatus = 'VOTING';
    else if (now >= campStart && now < campEnd) computedStatus = 'CAMPAIGN';
    else if (now >= regStart && now < regEnd) computedStatus = 'REGISTRATION';
    else if (now >= voteEnd) computedStatus = 'CLOSED';
  }

  const isRegistrationOpen = now >= regStart && now < regEnd;
  const isCampaignActive = now >= campStart && now < campEnd;
  const isVotingOpen = now >= voteStart && now < voteEnd;

  let msUntilNextPhase: number | null = null;
  if (isRegistrationOpen) msUntilNextPhase = campStart.getTime() - now.getTime();
  else if (isCampaignActive) msUntilNextPhase = voteStart.getTime() - now.getTime();
  else if (isVotingOpen) msUntilNextPhase = voteEnd.getTime() - now.getTime();

  return {
    election,
    computedStatus,
    isRegistrationOpen,
    isCampaignActive,
    isVotingOpen,
    msUntilNextPhase,
  };
}
