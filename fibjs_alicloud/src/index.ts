/// <reference types="@fibjs/types" />
import * as ssl from "ssl";
ssl.loadRootCerts();
import {RPCClient} from "./RPCClient";
import {ROAClient} from "./ROAClient";
import {OSSBucket, OSSObject} from "./OSSClient";
import {STS} from "./STS";
export{
    RPCClient,
    ROAClient,
    OSSObject,
    OSSBucket,
    STS
}





