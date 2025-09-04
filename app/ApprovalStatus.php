<?php

namespace App;

enum ApprovalStatus : string
{
    case APPROVED = 'approved';
    case ON_GOING = 'on_going';
    case SUBMISSION = 'submission';
}
