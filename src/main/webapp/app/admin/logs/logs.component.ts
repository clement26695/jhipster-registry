import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { Log } from './log.model';
import { LogsService } from './logs.service';

import { JhiRoutesService, Route } from 'app/shared';

@Component({
    selector: 'jhi-logs',
    templateUrl: './logs.component.html'
})
export class LogsComponent implements OnInit, OnDestroy {
    loggers: Log[];
    updatingLogs: boolean;
    filter: string;
    orderProp: string;
    reverse: boolean;

    activeRoute: Route;
    subscription: Subscription;
    instances: Route[];

    constructor(private logsService: LogsService, private routesService: JhiRoutesService) {
        this.filter = '';
        this.orderProp = 'name';
        this.reverse = false;
    }

    ngOnInit() {
        this.loggers = [];
        this.subscription = this.routesService.routeChanged$.subscribe((route) => {
            this.activeRoute = route;
            this.displayActiveRouteLogs();

            this.instances = [];
            this.routesService.findAll().subscribe((data) => {
                for (const instanceRoute of data) {
                    if (instanceRoute.appName === this.activeRoute.appName) {
                        this.instances.push(instanceRoute);
                    }
                }
            });
        });
    }

    changeLevel(name: string, level: string) {
        const log = new Log(name, level);

        for (const instance of this.instances) {
            if (instance.status !== 'DOWN') {
                this.logsService.changeInstanceLevel(instance, log).subscribe(() => {
                    if (instance.serviceId === this.activeRoute.serviceId) {
                        this.logsService.findInstanceAll(this.activeRoute).subscribe((response) => {
                            this.loggers = response.body;
                        });
                    }
                });
            }
        }
    }

    displayActiveRouteLogs() {
        this.updatingLogs = true;
        if (this.activeRoute && this.activeRoute.status !== 'DOWN') {
            this.logsService.findInstanceAll(this.activeRoute).subscribe(
                (response) => {
                    this.loggers = response.body;
                    this.updatingLogs = false;
                },
                (error) => {
                    if (error.status === 503 || error.status === 500 || error.status === 404) {
                        this.updatingLogs = false;
                        if (error.status === 500 || error.status === 404) {
                            this.routesService.routeDown(this.activeRoute);
                        }
                    }
                }
            );
        } else {
            this.routesService.routeDown(this.activeRoute);
        }
    }

    ngOnDestroy() {
        // prevent memory leak when component destroyed
        this.subscription.unsubscribe();
    }
}
